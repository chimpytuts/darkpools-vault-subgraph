import { BigInt, BigDecimal, log, Address } from '@graphprotocol/graph-ts';
import { Transfer } from '../types/templates/WeightedPool/BalancerPoolToken';
import { WeightedPool, SwapFeePercentageChanged } from '../types/templates/WeightedPool/WeightedPool';
import { HistoricalBalance, HistoricalTotalShare, HistoricalUserBalance, Pool } from '../types/schema';

import { tokenToDecimal, scaleDown, getPoolShare } from './helpers/misc';
import { ZERO_ADDRESS, ZERO_BD } from './helpers/constants';

/************************************
 *********** SWAP FEES ************
 ************************************/

export function handleSwapFeePercentageChange(event: SwapFeePercentageChanged): void {
  let poolAddress = event.address;

  // TODO - refactor so pool -> poolId doesn't require call
  let poolContract = WeightedPool.bind(poolAddress);
  let poolIdCall = poolContract.try_getPoolId();
  let poolId = poolIdCall.value;

  let pool = Pool.load(poolId.toHexString()) as Pool;

  pool.swapFee = scaleDown(event.params.swapFeePercentage, 18);
  pool.save();
}

/************************************
 *********** POOL SHARES ************
 ************************************/

export function handleTransfer(event: Transfer): void {
  let poolAddress = event.address;

  // TODO - refactor so pool -> poolId doesn't require call
  let poolContract = WeightedPool.bind(poolAddress);

  let poolIdCall = poolContract.try_getPoolId();
  let poolId = poolIdCall.value;

  let isMint = event.params.from.toHex() == ZERO_ADDRESS;
  let isBurn = event.params.to.toHex() == ZERO_ADDRESS;

  let poolShareFrom = getPoolShare(poolId.toHexString(), event.params.from);
  let poolShareFromBalance = poolShareFrom == null ? ZERO_BD : poolShareFrom.balance;

  let poolShareTo = getPoolShare(poolId.toHexString(), event.params.to);
  let poolShareToBalance = poolShareTo == null ? ZERO_BD : poolShareTo.balance;

  let pool = Pool.load(poolId.toHexString()) as Pool;

  let BPT_DECIMALS = 18;

  let users = new Array<string>();
  let balances = new Array<BigDecimal>();
  if (isMint) {
    poolShareTo.balance = poolShareTo.balance.plus(tokenToDecimal(event.params.value, BPT_DECIMALS));
    poolShareTo.save();
    pool.totalShares = pool.totalShares.plus(tokenToDecimal(event.params.value, BPT_DECIMALS));
    users.push(poolShareTo.userAddress);
    balances.push(poolShareTo.balance);
  } else if (isBurn) {
    poolShareFrom.balance = poolShareFrom.balance.minus(tokenToDecimal(event.params.value, BPT_DECIMALS));
    poolShareFrom.save();
    pool.totalShares = pool.totalShares.minus(tokenToDecimal(event.params.value, BPT_DECIMALS));
    users.push(poolShareFrom.userAddress);
    balances.push(poolShareFrom.balance);
  } else {
    poolShareTo.balance = poolShareTo.balance.plus(tokenToDecimal(event.params.value, BPT_DECIMALS));
    poolShareTo.save();

    poolShareFrom.balance = poolShareFrom.balance.minus(tokenToDecimal(event.params.value, BPT_DECIMALS));
    poolShareFrom.save();
    users.push(poolShareFrom.userAddress);
    users.push(poolShareTo.userAddress);
    balances.push(poolShareFrom.balance);
    balances.push(poolShareTo.balance);
  }

  if (poolShareTo !== null && poolShareTo.balance.notEqual(ZERO_BD) && poolShareToBalance.equals(ZERO_BD)) {
    pool.holdersCount = pool.holdersCount.plus(BigInt.fromI32(1));
  }

  if (poolShareFrom !== null && poolShareFrom.balance.equals(ZERO_BD) && poolShareFromBalance.notEqual(ZERO_BD)) {
    pool.holdersCount = pool.holdersCount.minus(BigInt.fromI32(1));
  }

  pool.save();

  updateSharePercentage(pool);
  addHistoricalValues(event, pool, users, balances);
}

function updateSharePercentage(pool: Pool): void {
  let shares = pool.shares.load();
  const hundred_bd = BigDecimal.fromString('100');
  for (let i: i32 = 0; i < shares.length; i++) {
    shares[i].percentage = shares[i].balance.div(pool.totalShares.div(hundred_bd));
    shares[i].save();
  }
  pool.save();
}

function addHistoricalValues(event: Transfer, pool: Pool, users: Array<string>, balances: Array<BigDecimal>): void {
  let timestamp = event.block.timestamp.toI32();
  let logIndex = event.logIndex.toHexString();
  let txHash = event.transaction.hash.toHexString();
  let id = `${txHash}-${pool.id}-hsv`;

  let historicalShareValue = HistoricalTotalShare.load(id);
  if (!historicalShareValue) {
    historicalShareValue = new HistoricalTotalShare(id);
    historicalShareValue.timestamp = timestamp;
    historicalShareValue.poolId = pool.id;
  }
  historicalShareValue.totalShares = pool.totalShares;
  historicalShareValue.save();
  log.warning('HERE {} {}', [users.length.toString(), id]);
  for (let i: i32 = 0; i < users.length; i++) {
    let userId = `${users[i]}-${pool.id}`;
    let historicalUserBalance = HistoricalUserBalance.load(userId);
    if (!historicalUserBalance) {
      historicalUserBalance = new HistoricalUserBalance(userId);
      historicalUserBalance.address = Address.fromString(users[i]);
      historicalUserBalance.poolId = pool.id;
      historicalUserBalance.save();
    }
    let hb = new HistoricalBalance(`${users[i]}-${logIndex}-${txHash}`);
    hb.hirstoricalUserBalance = historicalUserBalance.id;
    hb.value = balances[i];
    hb.timestamp = timestamp;
    hb.save();
  }
  pool.save();
}

// user, total_shares, balance, timestamp
// user: [balance, timestamp], total_shares:[value, timestamp]

// {
//   pools(first: 1) {
//     address
//     totalShares
//     historicalTotalShares{
//       value
//       timestamp
//     }
// 		historicalUserBalances{
//       address
//       balances{
//         value
//         timestamp
//       }
//     }
//   }
// }
