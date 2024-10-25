import { BigDecimal, BigInt, Address, dataSource } from '@graphprotocol/graph-ts';

export let ZERO = BigInt.fromI32(0);
export let ZERO_BD = BigDecimal.fromString('0');
export let ONE_BD = BigDecimal.fromString('1');
export let MIN_VIABLE_LIQUIDITY = BigDecimal.fromString('0.01');

export enum TokenBalanceEvent {
  SWAP_IN,
  SWAP_OUT,
  JOIN,
  EXIT,
}

export let ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export class AddressByNetwork {
  public velas: string;
  public arbitrum: string;
  public binance: string;
  public polygon: string;
}

let network: string = dataSource.network();

let vaultAddressByNetwork: AddressByNetwork = {
  velas: '0x82A8d8B59a13eD9df879C1f450a379182661AB59',
  arbitrum: '0x82A8d8B59a13eD9df879C1f450a379182661AB59',
  binance: '0x43223001aA561673807444df4A13c79156180d43',
  polygon: '0xBC77248Ded7b5C1Cd32B0Ce1533421c332BBfa0b',
};
let profitDistributionAddressByNetwork: AddressByNetwork = {
  velas: '0x2fca8adce09bacdc45af36e2e2f39b71ae1d2800',
  arbitrum: '0x2fca8adce09bacdc45af36e2e2f39b71ae1d2800',
  binance: '0x2fca8adce09bacdc45af36e2e2f39b71ae1d2800',
  polygon: '0x2fca8adce09bacdc45af36e2e2f39b71ae1d2800',
};
let zapperAddressByNetwork: AddressByNetwork = {
  velas: '0xcc8282cd85119f4e26ef2052bc55e8bb71c095dc',
  arbitrum: '0xcc8282cd85119f4e26ef2052bc55e8bb71c095dc',
  binance: '0xcc8282cd85119f4e26ef2052bc55e8bb71c095dc',
  polygon: '0xcc8282cd85119f4e26ef2052bc55e8bb71c095dc',
};

let wmaticAddressByNetwork: AddressByNetwork = {
  velas: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
  arbitrum: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
  binance: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
  polygon: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
};

let wethAddressByNetwork: AddressByNetwork = {
  velas: '0x74b23882a30290451A17c44f4F05243b6b58C76d',
  arbitrum: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
  binance: '0x2170ed0880ac9a755fd29b2688956bd959f933f8',
  polygon: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
};

let wbtcAddressByNetwork: AddressByNetwork = {
  velas: '0x321162Cd933E2Be498Cd2267a90534A804051b11',
  arbitrum: '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f',
  binance: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
  polygon: '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6',
};

let wbnbAddressByNetwork: AddressByNetwork = {
  velas: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
  arbitrum: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
  binance: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
  polygon: '0xecdcb5b88f8e3c15f95c720c51c71c9e2080525d',
};

let usdAddressByNetwork: AddressByNetwork = {
  velas: '0x049d68029688eabf473097a2fc38ef61633a3c7a',
  arbitrum: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
  binance: '0x48a8162b477d3c34e8529e70a4fbe92b9b5031cf',
  polygon: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
};

let usdcAddressByNetwork: AddressByNetwork = {
  velas: '0x04068da6c83afcfa0e13ba15a6696662335d5b75',
  arbitrum: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
  binance: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
  polygon: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
};

let daiAddressByNetwork: AddressByNetwork = {
  velas: '0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e',
  arbitrum: '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1',
  binance: '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3',
  polygon: '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063',
};

let busdAddressByNetwork: AddressByNetwork = {
  velas: '0xc9baa8cfdde8e328787e29b4b078abf2dadc2055',
  arbitrum: '0xc9baa8cfdde8e328787e29b4b078abf2dadc2055',
  binance: '0xc9baa8cfdde8e328787e29b4b078abf2dadc2055',
  polygon: '0x9C9e5fD8bbc25984B178FdCE6117Defa39d2db39',
};

let nativeAssetAddressByNetwork: AddressByNetwork = {
  velas: '0x380f73bAd5E7396B260f737291AE5A8100baabcD',
  arbitrum: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
  binance: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  polygon: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
};

function forNetwork(addressByNetwork: AddressByNetwork): Address {
  if (network == 'velas') {
    return Address.fromString(addressByNetwork.velas);
  } else if (network == 'arbitrum-one') {
    return Address.fromString(addressByNetwork.arbitrum);
  } else if (network == 'matic') {
    return Address.fromString(addressByNetwork.polygon);
  }
  return Address.fromString(addressByNetwork.binance);
}

export let VAULT_ADDRESS = forNetwork(vaultAddressByNetwork);
export let PROFIT_DISTRIBUTION_ADDRESS = forNetwork(profitDistributionAddressByNetwork);
export let ZAPPER_ADDRESS = forNetwork(zapperAddressByNetwork);
export let ZAPPER_ADDRESSES: Address[] = [
  Address.fromString('0xcc8282cd85119f4e26ef2052bc55e8bb71c095dc'),
  Address.fromString('0xf31f24194f01d865cbb68ce2324e0af1e3bc932a'),
  Address.fromString('0x5981f011f893d5cf2bd3dc66de2ea524fb9e233c'),
  Address.fromString('0xde0393b4a7589b50811aa10802c38ab6d5a4dacb'),
];
export let WETH: Address = forNetwork(wethAddressByNetwork);
export let WMATIC: Address = forNetwork(wmaticAddressByNetwork);
export let WBNB: Address = forNetwork(wbnbAddressByNetwork);
export let WBTC: Address = forNetwork(wbtcAddressByNetwork);
export let USD: Address = forNetwork(usdAddressByNetwork);
export let USDC: Address = forNetwork(usdcAddressByNetwork);
export let DAI: Address = forNetwork(daiAddressByNetwork);

// export let AVAX: Address = Address.fromString('0x332730a4F6E03D9C55829435f10360E13cfA41Ff');
// export let MATIC: Address = Address.fromString('0xA649325Aa7C5093d12D6F98EB4378deAe68CE23F');
// export let BNB: Address = Address.fromString('0x65e66a61D0a8F1e686C2D6083ad611a10D84D97A');

export let BUSD: Address = forNetwork(busdAddressByNetwork);
export let NATIVE_ASSET: Address = forNetwork(nativeAssetAddressByNetwork);

//export let PRICING_ASSETS: Address[] = [];
export let USD_STABLE_ASSETS: Address[] = [USD, USDC, DAI];

export let PRICING_ASSETS: Address[] = [WETH, WBTC, USDC, DAI, USD];
//export let USD_STABLE_ASSETS: Address[] = [USDC, DAI, AUSD, MIM];
