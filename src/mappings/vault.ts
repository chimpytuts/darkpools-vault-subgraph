import { BigInt, BigDecimal, Address, log } from '@graphprotocol/graph-ts';
import {
  Swap as SwapEvent,
  PoolBalanceChanged,
  PoolBalanceManaged,
  InternalBalanceChanged,
} from '../types/Vault/Vault';
import {
  Balancer,
  Pool,
  Swap,
  JoinExit,
  Investment,
  TokenPrice,
  UserInternalBalance,
  PoolHistoricalBalance,
  HistoricalToken,
  Token,
  PoolToken,
  TokenPair,
} from '../types/schema';
import {
  tokenToDecimal,
  getTokenPriceId,
  getHistoricalBalanceId,
  scaleDown,
  createPoolSnapshot,
  saveSwapToSnapshot,
  createUserEntity,
  getTokenDecimals,
  loadPoolToken,
  uptickSwapsForToken,
  updateTokenBalances,
  getTradePairSnapshot,
  getTradePair,
  getBalancerSnapshot,
  getToken,
  getHistoricalTokenId,
} from './helpers/misc';
import { updatePoolWeights } from './helpers/weighted';
import { isUSDStable, isPricingAsset, updatePoolLiquidity, valueInUSD } from './pricing';
import { MIN_VIABLE_LIQUIDITY, ONE_BD, TokenBalanceEvent, ZERO, ZERO_BD } from './helpers/constants';
import { isStableLikePool, isVariableWeightPool } from './helpers/pools';

/************************************
 ******** INTERNAL BALANCES *********
 ************************************/

export function handleInternalBalanceChange(event: InternalBalanceChanged): void {
  createUserEntity(event.params.user);

  let userAddress = event.params.user.toHexString();
  let token = event.params.token;
  let balanceId = userAddress.concat(token.toHexString());

  let userBalance = UserInternalBalance.load(balanceId);
  if (userBalance == null) {
    userBalance = new UserInternalBalance(balanceId);

    userBalance.userAddress = userAddress;
    userBalance.token = token;
    userBalance.balance = ZERO_BD;
  }

  let transferAmount = tokenToDecimal(event.params.delta, getTokenDecimals(token));
  userBalance.balance = userBalance.balance.plus(transferAmount);

  userBalance.save();
}

/************************************
 ****** DEPOSITS & WITHDRAWALS ******
 ************************************/

export function handleBalanceChange(event: PoolBalanceChanged): void {
  let amounts: BigInt[] = event.params.deltas;

  if (amounts.length === 0) {
    return;
  }
  let total: BigInt = amounts.reduce<BigInt>((sum, amount) => sum.plus(amount), new BigInt(0));
  if (total.gt(ZERO)) {
    handlePoolJoined(event);
  } else {
    handlePoolExited(event);
  }
}

function saveHistoricalToken(
  tokenAddress: string,
  transactionHash: string,
  userAddress: string,
  tokenId: string,
  tokenAmount: BigDecimal,
  tokenAmountUSD: BigDecimal,
  phbId: string
): void {
  let historicalTokenId = getHistoricalTokenId(tokenAddress, transactionHash, userAddress, tokenAmount);
  let historicalToken = new HistoricalToken(historicalTokenId);
  historicalToken.historicalBalanceId = phbId;
  historicalToken.token = tokenId;
  historicalToken.balance = tokenAmount;
  historicalToken.balanceUsd = tokenAmountUSD;

  historicalToken.save();
}

function addTokenPairBalance(pairs: string[], tokenAddress: string, tokenAmount: BigDecimal): void {
  log.warning('HERE - {}', [pairs.length.toString()]);
  for (let i: i32 = 0; i < pairs.length; i++) {
    let pair = TokenPair.load(pairs[i]);
    if (!pair) continue;
    let splited = pair.id.split('-');
    log.warning('SPLITED - {}', splited);
    log.warning('tokenAddress - {}', [tokenAddress]);
    if (splited[0] == tokenAddress) {
      pair.balanceToken0 = tokenAmount;
    } else if (splited[1] == tokenAddress) {
      pair.balanceToken1 = tokenAmount;
    }
    pair.save();
  }
}

function handlePoolJoined(event: PoolBalanceChanged): void {
  let poolId: string = event.params.poolId.toHexString();
  let amounts: BigInt[] = event.params.deltas;
  let blockTimestamp = event.block.timestamp.toI32();
  let logIndex = event.logIndex;
  let transactionHash = event.transaction.hash;

  let pool = Pool.load(poolId);
  if (pool == null) {
    log.warning('Pool not found in handlePoolJoined: {} {}', [poolId, transactionHash.toHexString()]);
    return;
  }
  let tokenAddresses = pool.tokensList;

  let joinId = transactionHash.toHexString().concat(logIndex.toString());
  let join = new JoinExit(joinId);
  join.sender = event.params.liquidityProvider;
  let joinAmounts = new Array<BigDecimal>(amounts.length);
  for (let i: i32 = 0; i < tokenAddresses.length; i++) {
    let tokenAddress: Address = Address.fromString(tokenAddresses[i].toHexString());
    let poolToken = loadPoolToken(poolId, tokenAddress);
    if (poolToken == null) {
      throw new Error('poolToken not found');
    }
    let joinAmount = scaleDown(amounts[i], poolToken.decimals);
    joinAmounts[i] = joinAmount;
  }
  let userAddress = event.params.liquidityProvider.toHexString();
  join.type = 'Join';
  join.amounts = joinAmounts;
  join.pool = event.params.poolId.toHexString();
  join.user = userAddress;
  join.timestamp = blockTimestamp;
  join.tx = transactionHash;
  join.valueUSD = ZERO_BD;

  let phbId = getHistoricalBalanceId(poolId, transactionHash.toHexString(), logIndex.toString());
  let phb = new PoolHistoricalBalance(phbId);
  phb.block = event.block.number;
  phb.timestamp = blockTimestamp;
  phb.poolId = poolId;
  for (let i: i32 = 0; i < tokenAddresses.length; i++) {
    let tokenAddress: Address = Address.fromString(tokenAddresses[i].toHexString());
    let poolToken = loadPoolToken(poolId, tokenAddress);

    // adding initial liquidity
    if (poolToken == null) {
      throw new Error('poolToken not found');
    }
    let tokenAmountIn = tokenToDecimal(amounts[i], poolToken.decimals);
    let newAmount = poolToken.balance.plus(tokenAmountIn);
    let tokenAmountInUSD = valueInUSD(tokenAmountIn, tokenAddress);

    join.valueUSD = join.valueUSD.plus(tokenAmountInUSD);

    poolToken.balance = newAmount;
    poolToken.save();

    updateTokenBalances(tokenAddress, tokenAmountIn, TokenBalanceEvent.JOIN, event);
    let loaded_token = Token.load(tokenAddress.toHexString());
    if (loaded_token) {
      saveHistoricalToken(
        tokenAddress.toHexString(),
        transactionHash.toHexString(),
        join.sender.toHexString(),
        poolToken.id,
        loaded_token.totalBalanceNotional,
        loaded_token.totalBalanceUSD,
        phbId
      );
      addTokenPairBalance(loaded_token.pairs, loaded_token.address, loaded_token.totalBalanceNotional);
    }
  }
  phb.save();
  join.save();

  for (let i: i32 = 0; i < tokenAddresses.length; i++) {
    let tokenAddress: Address = Address.fromString(tokenAddresses[i].toHexString());
    if (isPricingAsset(tokenAddress)) {
      let success = updatePoolLiquidity(poolId, event.block.number, tokenAddress, blockTimestamp);
      // Some pricing assets may not have a route back to USD yet
      // so we keep trying until we find one
      if (success) {
        break;
      }
    }
  }

  createPoolSnapshot(poolId, blockTimestamp);
}

function handlePoolExited(event: PoolBalanceChanged): void {
  let poolId = event.params.poolId.toHex();
  let amounts = event.params.deltas;
  let blockTimestamp = event.block.timestamp.toI32();
  let logIndex = event.logIndex;
  let transactionHash = event.transaction.hash;

  let pool = Pool.load(poolId);
  if (pool == null) {
    log.warning('Pool not found in handlePoolExited: {} {}', [poolId, transactionHash.toHexString()]);
    return;
  }
  let tokenAddresses = pool.tokensList;

  pool.save();

  let exitId = transactionHash.toHexString().concat(logIndex.toString());
  let exit = new JoinExit(exitId);
  exit.sender = event.params.liquidityProvider;
  let exitAmounts = new Array<BigDecimal>(amounts.length);

  for (let i: i32 = 0; i < tokenAddresses.length; i++) {
    let tokenAddress: Address = Address.fromString(tokenAddresses[i].toHexString());
    let poolToken = loadPoolToken(poolId, tokenAddress);
    if (poolToken == null) {
      throw new Error('poolToken not found');
    }
    let exitAmount = scaleDown(amounts[i].neg(), poolToken.decimals);
    exitAmounts[i] = exitAmount;
  }
  exit.type = 'Exit';
  exit.amounts = exitAmounts;
  exit.pool = event.params.poolId.toHexString();
  exit.user = event.params.liquidityProvider.toHexString();
  exit.timestamp = blockTimestamp;
  exit.tx = transactionHash;
  exit.valueUSD = ZERO_BD;

  let phbId = getHistoricalBalanceId(poolId, transactionHash.toHexString(), logIndex.toString());
  let phb = new PoolHistoricalBalance(phbId);
  phb.block = event.block.number;
  phb.timestamp = blockTimestamp;
  phb.poolId = poolId;
  for (let i: i32 = 0; i < tokenAddresses.length; i++) {
    let tokenAddress: Address = Address.fromString(tokenAddresses[i].toHexString());
    let poolToken = loadPoolToken(poolId, tokenAddress);

    // adding initial liquidity
    if (poolToken == null) {
      throw new Error('poolToken not found');
    }
    let tokenAmountOut = tokenToDecimal(amounts[i].neg(), poolToken.decimals);
    let newAmount = poolToken.balance.minus(tokenAmountOut);
    let tokenAmountOutUSD = valueInUSD(tokenAmountOut, tokenAddress);

    exit.valueUSD = exit.valueUSD.plus(tokenAmountOutUSD);

    poolToken.balance = newAmount;
    poolToken.save();

    updateTokenBalances(tokenAddress, tokenAmountOut, TokenBalanceEvent.EXIT, event);
    let loadedToken = Token.load(tokenAddress.toHexString());

    if (loadedToken) {
      saveHistoricalToken(
        tokenAddress.toHexString(),
        transactionHash.toHexString(),
        exit.sender.toHexString(),
        poolToken.id,
        loadedToken.totalBalanceNotional,
        loadedToken.totalBalanceUSD,
        phbId
      );
      addTokenPairBalance(loadedToken.pairs, loadedToken.address, loadedToken.totalBalanceNotional);
    }
  }

  exit.save();
  phb.save();
  for (let i: i32 = 0; i < tokenAddresses.length; i++) {
    let tokenAddress: Address = Address.fromString(tokenAddresses[i].toHexString());
    if (isPricingAsset(tokenAddress)) {
      let success = updatePoolLiquidity(poolId, event.block.number, tokenAddress, blockTimestamp);
      // Some pricing assets may not have a route back to USD yet
      // so we keep trying until we find one
      if (success) {
        break;
      }
    }
  }

  createPoolSnapshot(poolId, blockTimestamp);
}

/************************************
 ********** INVESTMENTS *************
 ************************************/
export function handleBalanceManage(event: PoolBalanceManaged): void {
  let poolId = event.params.poolId;
  let pool = Pool.load(poolId.toHex());
  if (pool == null) {
    log.warning('Pool not found in handleBalanceManage: {}', [poolId.toHexString()]);
    return;
  }

  let token: Address = event.params.token;
  let assetManagerAddress: Address = event.params.assetManager;

  //let cashDelta = event.params.cashDelta;
  let managedDelta = event.params.managedDelta;

  let poolToken = loadPoolToken(poolId.toHexString(), token);
  if (poolToken == null) {
    throw new Error('poolToken not found');
  }

  let managedDeltaAmount = tokenToDecimal(managedDelta, poolToken.decimals);

  poolToken.invested = poolToken.invested.plus(managedDeltaAmount);
  poolToken.save();

  let assetManagerId = poolToken.id.concat(assetManagerAddress.toHexString());

  let investment = new Investment(assetManagerId);
  investment.assetManagerAddress = assetManagerAddress;
  investment.poolTokenId = poolToken.id;
  investment.amount = managedDeltaAmount;
  investment.timestamp = event.block.timestamp.toI32();
  investment.save();
}
class SwapTokenInfo {
  amount: BigDecimal;
  id: string;
  constructor(_amount: BigDecimal, _id: string) {
    this.amount = _amount;
    this.id = _id;
  }
}

/************************************
 ************** SWAPS ***************
 ************************************/
export function handleSwapEvent(event: SwapEvent): void {
  createUserEntity(event.transaction.from);
  let poolId = event.params.poolId;

  let pool = Pool.load(poolId.toHexString());
  if (pool == null) {
    log.warning('Pool not found in handleSwapEvent: {}', [poolId.toHexString()]);
    return;
  }

  if (isVariableWeightPool(pool)) {
    // Some pools' weights update over time so we need to update them after each swap
    updatePoolWeights(poolId.toHexString());
  } else if (isStableLikePool(pool)) {
    // Stablelike pools' amplification factors update over time so we need to update them after each swap
  }

  let tokenInAddress: Address = event.params.tokenIn;
  let tokenOutAddress: Address = event.params.tokenOut;

  let logIndex = event.logIndex;
  let transactionHash = event.transaction.hash;
  let blockTimestamp = event.block.timestamp.toI32();

  let poolTokenIn = loadPoolToken(poolId.toHexString(), tokenInAddress);
  let poolTokenOut = loadPoolToken(poolId.toHexString(), tokenOutAddress);
  if (poolTokenIn == null || poolTokenOut == null) {
    log.warning('PoolToken not found in handleSwapEvent: (tokenIn: {}), (tokenOut: {})', [
      tokenInAddress.toHexString(),
      tokenOutAddress.toHexString(),
    ]);
    return;
  }

  let tokenAmountIn: BigDecimal = scaleDown(event.params.amountIn, poolTokenIn.decimals);
  let tokenAmountOut: BigDecimal = scaleDown(event.params.amountOut, poolTokenOut.decimals);

  let swapValueUSD = ZERO_BD;
  if (isUSDStable(tokenOutAddress)) {
    swapValueUSD = valueInUSD(tokenAmountOut, tokenOutAddress);
  } else if (isUSDStable(tokenInAddress)) {
    swapValueUSD = valueInUSD(tokenAmountIn, tokenInAddress);
  } else {
    let tokenInSwapValueUSD = valueInUSD(tokenAmountIn, tokenInAddress);
    let tokenOutSwapValueUSD = valueInUSD(tokenAmountOut, tokenOutAddress);
    let divisor =
      tokenInSwapValueUSD.gt(ZERO_BD) && tokenOutSwapValueUSD.gt(ZERO_BD) ? BigDecimal.fromString('2') : ONE_BD;
    swapValueUSD = tokenInSwapValueUSD.plus(tokenOutSwapValueUSD).div(divisor);
  }

  //}

  let swapId = transactionHash.toHexString().concat(logIndex.toString());
  let swap = new Swap(swapId);
  swap.tokenIn = tokenInAddress;
  swap.tokenInSym = poolTokenIn.symbol;
  swap.tokenAmountIn = tokenAmountIn;

  swap.tokenOut = tokenOutAddress;
  swap.tokenOutSym = poolTokenOut.symbol;
  swap.tokenAmountOut = tokenAmountOut;

  swap.valueUSD = swapValueUSD;

  swap.caller = event.transaction.from;
  swap.userAddress = event.transaction.from.toHex();
  swap.poolId = poolId.toHex();

  swap.timestamp = blockTimestamp;
  swap.tx = transactionHash;

  swap.save();

  // update pool swapsCount
  // let pool = Pool.load(poolId.toHex());
  pool.swapsCount = pool.swapsCount.plus(BigInt.fromI32(1));
  pool.totalSwapVolume = pool.totalSwapVolume.plus(swapValueUSD);

  let swapFee = pool.swapFee;
  let swapFeesUSD = swapValueUSD.times(swapFee);
  pool.totalSwapFee = pool.totalSwapFee.plus(swapFeesUSD);

  pool.save();

  // update vault total swap volume
  let vault = Balancer.load('2') as Balancer;
  vault.totalSwapVolume = vault.totalSwapVolume.plus(swapValueUSD);
  vault.totalSwapFee = vault.totalSwapFee.plus(swapFeesUSD);
  vault.totalSwapCount = vault.totalSwapCount.plus(BigInt.fromI32(1));
  vault.save();

  let vaultSnapshot = getBalancerSnapshot(vault.id, blockTimestamp);
  vaultSnapshot.totalSwapVolume = vault.totalSwapVolume;
  vaultSnapshot.totalSwapFee = vault.totalSwapFee;
  vaultSnapshot.totalSwapCount = vault.totalSwapCount;
  vaultSnapshot.save();

  let phbId = getHistoricalBalanceId(pool.id, transactionHash.toHexString(), logIndex.toString());
  let phb = new PoolHistoricalBalance(phbId);
  phb.block = event.block.number;
  phb.timestamp = blockTimestamp;
  phb.poolId = pool.id;

  let newInAmount = poolTokenIn.balance.plus(tokenAmountIn);
  poolTokenIn.balance = newInAmount;
  poolTokenIn.save();

  let newOutAmount = poolTokenOut.balance.minus(tokenAmountOut);
  poolTokenOut.balance = newOutAmount;
  poolTokenOut.save();
  // var amounts = new Map<string, SwapTokenInfo>();
  // amounts.set(tokenOutAddress.toHexString(), new SwapTokenInfo(newOutAmount, poolTokenOut.id));
  // amounts.set(tokenInAddress.toHexString(), new SwapTokenInfo(newInAmount, poolTokenIn.id));
  // let tokenAddresses = pool.tokensList;
  // for (let i: i32 = 0; i < tokenAddresses.length; i++) {
  //   let tokenAddress: string = tokenAddresses[i].toHexString();
  //   if (amounts.has(tokenAddress)) {
  //     saveHistoricalToken(
  //       tokenAddress,
  //       transactionHash.toHexString(),
  //       swap.userAddress,
  //       amounts[tokenAddress].id,
  //       amounts[tokenAddress].amount,
  //       valueInUSD(amounts[tokenAddress].amount, Address.fromString(tokenAddress)),
  //       phbId
  //     );
  //   } else {
  //     let poolToken = loadPoolToken(poolId.toHexString(), Address.fromString(tokenAddress));
  //     if (poolToken) {
  //     }
  //   }
  // }

  phb.save();
  // update swap counts for token
  // updates token snapshots as well
  uptickSwapsForToken(tokenInAddress, event);
  uptickSwapsForToken(tokenOutAddress, event);

  let tradePair = getTradePair(tokenInAddress, tokenOutAddress);
  tradePair.totalSwapVolume = tradePair.totalSwapVolume.plus(swapValueUSD);
  tradePair.totalSwapFee = tradePair.totalSwapFee.plus(swapFeesUSD);
  tradePair.save();

  let tradePairSnapshot = getTradePairSnapshot(tradePair.id, blockTimestamp);
  tradePairSnapshot.totalSwapVolume = tradePair.totalSwapVolume.plus(swapValueUSD);
  tradePairSnapshot.totalSwapFee = tradePair.totalSwapFee.plus(swapFeesUSD);
  tradePairSnapshot.save();

  if (swap.tokenAmountOut == ZERO_BD || swap.tokenAmountIn == ZERO_BD) {
    return;
  }

  // Capture price
  let block = event.block.number;
  let tokenInWeight = poolTokenIn.weight;
  let tokenOutWeight = poolTokenOut.weight;
  if (isPricingAsset(tokenInAddress) && pool.totalLiquidity.gt(MIN_VIABLE_LIQUIDITY)) {
    let tokenPriceId = getTokenPriceId(poolId.toHex(), tokenOutAddress, tokenInAddress, block);
    let tokenPrice = new TokenPrice(tokenPriceId);
    //tokenPrice.poolTokenId = getPoolTokenId(poolId, tokenOutAddress);

    tokenPrice.poolId = poolId.toHexString();
    tokenPrice.block = block;
    tokenPrice.timestamp = blockTimestamp;
    tokenPrice.asset = tokenOutAddress;
    tokenPrice.amount = tokenAmountIn;
    tokenPrice.pricingAsset = tokenInAddress;

    if (tokenInWeight && tokenOutWeight) {
      // As the swap is with a WeightedPool, we can easily calculate the spot price between the two tokens
      // based on the pool's weights and updated balances after the swap.
      tokenPrice.price = newInAmount.div(tokenInWeight).div(newOutAmount.div(tokenOutWeight));
    } else {
      // Otherwise we can get a simple measure of the price from the ratio of amount in vs amount out
      tokenPrice.price = tokenAmountIn.div(tokenAmountOut);
    }

    tokenPrice.priceUSD = valueInUSD(tokenPrice.price, tokenInAddress);
    tokenPrice.save();

    updatePoolLiquidity(poolId.toHex(), block, tokenInAddress, blockTimestamp);
  }
  if (isPricingAsset(tokenOutAddress) && pool.totalLiquidity.gt(MIN_VIABLE_LIQUIDITY)) {
    let tokenPriceId = getTokenPriceId(poolId.toHex(), tokenInAddress, tokenOutAddress, block);
    let tokenPrice = new TokenPrice(tokenPriceId);
    //tokenPrice.poolTokenId = getPoolTokenId(poolId, tokenInAddress);
    tokenPrice.poolId = poolId.toHexString();
    tokenPrice.block = block;
    tokenPrice.timestamp = blockTimestamp;
    tokenPrice.asset = tokenInAddress;
    tokenPrice.amount = tokenAmountOut;
    tokenPrice.pricingAsset = tokenOutAddress;

    if (tokenInWeight && tokenOutWeight) {
      // As the swap is with a WeightedPool, we can easily calculate the spot price between the two tokens
      // based on the pool's weights and updated balances after the swap.
      tokenPrice.price = newOutAmount.div(tokenOutWeight).div(newInAmount.div(tokenInWeight));
    } else {
      // Otherwise we can get a simple measure of the price from the ratio of amount out vs amount in
      tokenPrice.price = tokenAmountOut.div(tokenAmountIn);
    }

    tokenPrice.priceUSD = valueInUSD(tokenPrice.price, tokenOutAddress);
    tokenPrice.save();

    updatePoolLiquidity(poolId.toHex(), block, tokenOutAddress, blockTimestamp);
  }

  createPoolSnapshot(poolId.toHexString(), blockTimestamp);
  saveSwapToSnapshot(poolId.toHexString(), blockTimestamp, swapValueUSD, swapFeesUSD);

  // update volume and balances for the tokens
  // updates token snapshots as well
  updateTokenBalances(tokenInAddress, tokenAmountIn, TokenBalanceEvent.SWAP_IN, event);
  let loadedInToken = Token.load(tokenInAddress.toHexString());
  if (loadedInToken) {
    addTokenPairBalance(loadedInToken.pairs, loadedInToken.address, loadedInToken.totalBalanceNotional);
    let poolToken = loadPoolToken(poolId.toHexString(), Address.fromString(loadedInToken.address));
    if (poolToken)
      saveHistoricalToken(
        loadedInToken.address,
        transactionHash.toHexString(),
        swap.userAddress,
        poolToken.id,
        loadedInToken.totalBalanceNotional,
        loadedInToken.totalBalanceUSD,
        phbId
      );
  }
  updateTokenBalances(tokenOutAddress, tokenAmountOut, TokenBalanceEvent.SWAP_OUT, event);
  let loadedOutToken = Token.load(tokenOutAddress.toHexString());
  if (loadedOutToken) {
    addTokenPairBalance(loadedOutToken.pairs, loadedOutToken.address, loadedOutToken.totalBalanceNotional);
    let poolToken = loadPoolToken(poolId.toHexString(), Address.fromString(loadedOutToken.address));
    if (poolToken)
      saveHistoricalToken(
        loadedOutToken.address,
        transactionHash.toHexString(),
        swap.userAddress,
        poolToken.id,
        loadedOutToken.totalBalanceNotional,
        loadedOutToken.totalBalanceUSD,
        phbId
      );
  }
}
