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
}

let network: string = dataSource.network();

let vaultAddressByNetwork: AddressByNetwork = {
  velas: '0x82A8d8B59a13eD9df879C1f450a379182661AB59',
  arbitrum: '0x82A8d8B59a13eD9df879C1f450a379182661AB59',
  binance: '0x36B129B35Ac950b15558973fc246121923E3fD63',
};

let wethAddressByNetwork: AddressByNetwork = {
  velas: '0x74b23882a30290451A17c44f4F05243b6b58C76d',
  arbitrum: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
  binance: '0x2170ed0880ac9a755fd29b2688956bd959f933f8',
};

let wbtcAddressByNetwork: AddressByNetwork = {
  velas: '0x321162Cd933E2Be498Cd2267a90534A804051b11',
  arbitrum: '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f',
  binance: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
};

let usdAddressByNetwork: AddressByNetwork = {
  velas: '0x049d68029688eabf473097a2fc38ef61633a3c7a',
  arbitrum: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
  binance: '0x55d398326f99059ff775485246999027b3197955',
};

let usdcAddressByNetwork: AddressByNetwork = {
  velas: '0x04068da6c83afcfa0e13ba15a6696662335d5b75',
  arbitrum: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
  binance: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
};

let balAddressByNetwork: AddressByNetwork = {
  velas: '0xFF22eF4216dF83Bb87a92Ca01147010044971138',
  arbitrum: '0x117E0b609C7eEDafeF1A83Ad692dE52817A0B2F6',
  binance: '?', // no ball address in binance constants
};

let daiAddressByNetwork: AddressByNetwork = {
  velas: '0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e',
  arbitrum: '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1',
  binance: '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3',
};

let busdAddressByNetwork: AddressByNetwork = {
  velas: '0xc9baa8cfdde8e328787e29b4b078abf2dadc2055',
  arbitrum: '0xc9baa8cfdde8e328787e29b4b078abf2dadc2055',
  binance: '0xc9baa8cfdde8e328787e29b4b078abf2dadc2055',
};

function forNetwork(addressByNetwork: AddressByNetwork): Address {
  if (network == 'velas') {
    return Address.fromString(addressByNetwork.velas);
  } else if (network == 'arbitrum-one') {
    return Address.fromString(addressByNetwork.arbitrum);
  }
  return Address.fromString(addressByNetwork.binance);
}

export let VAULT_ADDRESS = forNetwork(vaultAddressByNetwork);
export let WETH: Address = forNetwork(wethAddressByNetwork);
export let WBTC: Address = forNetwork(wbtcAddressByNetwork);
export let USD: Address = forNetwork(usdAddressByNetwork);
export let USDC: Address = forNetwork(usdcAddressByNetwork);
export let BAL: Address = forNetwork(balAddressByNetwork);
export let DAI: Address = forNetwork(daiAddressByNetwork);

// export let AVAX: Address = Address.fromString('0x332730a4F6E03D9C55829435f10360E13cfA41Ff');
// export let MATIC: Address = Address.fromString('0xA649325Aa7C5093d12D6F98EB4378deAe68CE23F');
// export let BNB: Address = Address.fromString('0x65e66a61D0a8F1e686C2D6083ad611a10D84D97A');

export let BUSD: Address = forNetwork(busdAddressByNetwork);

export let PRICING_ASSETS: Address[] = [WETH, WBTC, USDC, USD, DAI];
export let USD_STABLE_ASSETS: Address[] = [USDC, DAI, USD];

//export let PRICING_ASSETS: Address[] = [WETH, WBTC, USDC, DAI, BAL, MIM, AUSD];
//export let USD_STABLE_ASSETS: Address[] = [USDC, DAI, AUSD, MIM];
