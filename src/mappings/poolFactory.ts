import { ZERO_BD, VAULT_ADDRESS, ZERO } from './helpers/constants';
import { PoolType } from './helpers/pools';

import {
  newPoolEntity,
  createPoolTokenEntity,
  scaleDown,
  getBalancerSnapshot,
  generateCombinations,
} from './helpers/misc';
import { updatePoolWeights } from './helpers/weighted';

import { BigInt, Address, Bytes, log } from '@graphprotocol/graph-ts';
import { PoolCreated } from '../types/WeightedPoolFactory/WeightedPoolFactory';
import { Balancer, Pool, Token, TokenPair } from '../types/schema';

// datasource
import { WeightedPool as WeightedPoolTemplate } from '../types/templates';
import { Vault } from '../types/Vault/Vault';
import { WeightedPool } from '../types/templates/WeightedPool/WeightedPool';
import { ERC20 } from '../types/Vault/ERC20';

function createWeightedLikePool(event: PoolCreated, poolType: string): string {
  let poolAddress: Address = event.params.pool;
  let poolContract = WeightedPool.bind(poolAddress);

  let poolIdCall = poolContract.try_getPoolId();
  let poolId = poolIdCall.value;

  let swapFeeCall = poolContract.try_getSwapFeePercentage();
  let swapFee = swapFeeCall.value;

  let ownerCall = poolContract.try_getOwner();
  let owner = ownerCall.value;

  let pool = handleNewPool(event, poolId, swapFee);
  pool.poolType = poolType;
  pool.factory = event.address;
  pool.owner = owner;

  let vaultContract = Vault.bind(VAULT_ADDRESS);
  let tokensCall = vaultContract.try_getPoolTokens(poolId);
  let pairs = new Array<string>();
  if (!tokensCall.reverted) {
    let tokens = tokensCall.value.value0;
    pool.tokensList = changetype<Bytes[]>(tokens);
    pool.save();
    let combinations: string[] = [];
    generateCombinations(combinations, tokens, [], 0);
    log.warning('HERE {}', [pool.id]);
    log.warning('TOKENS {}', [tokens.length.toString()]);
    for (let i: i32 = 0; i < tokens.length; i++) {
      createPoolTokenEntity(poolId.toHexString(), tokens[i]);
    }

    for (let i: i32 = 0; i < combinations.length; i++) {
      let id = `${pool.id}-${combinations[i]}`;
      let poolTokenPair = TokenPair.load(id);
      let splited = combinations[i].split('-');
      let token0 = Token.load(splited[0]);
      let token1 = Token.load(splited[1]);
      if (!poolTokenPair) {
        poolTokenPair = new TokenPair(id);
        poolTokenPair.balanceToken0 = ZERO_BD;
        poolTokenPair.balanceToken1 = ZERO_BD;
        poolTokenPair.pool = pool.id;
      }
      poolTokenPair.save();
      let reversedId = `${pool.id}-${splited[1]}-${splited[0]}`;
      if (token0 && token1) {
        if (!token0.pairs.includes(combinations[i]) && !token0.pairs.includes(reversedId)) {
          token0.pairs = token0.pairs.concat([poolTokenPair.id]);
        }
        if (!token1.pairs.includes(combinations[i]) && !token1.pairs.includes(reversedId)) {
          token1.pairs = token1.pairs.concat([poolTokenPair.id]);
        }
        token0.save();
        token1.save();
      }
      pairs.push(combinations[i]);
    }
  }
  //pool.pairs = pairs;
  pool.save();

  // Load pool with initial weights
  updatePoolWeights(poolId.toHexString());

  return poolId.toHexString();
}

export function handleNewWeightedPool(event: PoolCreated): void {
  createWeightedLikePool(event, PoolType.Weighted);
  WeightedPoolTemplate.create(event.params.pool);
}

function findOrInitializeVault(): Balancer {
  let vault: Balancer | null = Balancer.load('2');
  if (vault != null) return vault;

  // if no vault yet, set up blank initial
  vault = new Balancer('2');
  vault.poolCount = 0;
  vault.totalLiquidity = ZERO_BD;
  vault.totalSwapVolume = ZERO_BD;
  vault.totalSwapFee = ZERO_BD;
  vault.totalSwapCount = ZERO;
  return vault;
}

function handleNewPool(event: PoolCreated, poolId: Bytes, swapFee: BigInt): Pool {
  let poolAddress: Address = event.params.pool;

  let pool = Pool.load(poolId.toHexString());
  if (pool == null) {
    pool = newPoolEntity(poolId.toHexString());

    pool.swapFee = scaleDown(swapFee, 18);
    pool.createTime = event.block.timestamp.toI32();
    pool.address = poolAddress;
    pool.tx = event.transaction.hash;
    pool.swapEnabled = true;

    let bpt = ERC20.bind(poolAddress);

    let nameCall = bpt.try_name();
    if (!nameCall.reverted) {
      pool.name = nameCall.value;
    }

    let symbolCall = bpt.try_symbol();
    if (!symbolCall.reverted) {
      pool.symbol = symbolCall.value;
    }
    pool.save();

    let vault = findOrInitializeVault();
    vault.poolCount += 1;
    vault.save();

    let vaultSnapshot = getBalancerSnapshot(vault.id, event.block.timestamp.toI32());
    vaultSnapshot.poolCount += 1;
    vaultSnapshot.save();
  }

  return pool;
}
