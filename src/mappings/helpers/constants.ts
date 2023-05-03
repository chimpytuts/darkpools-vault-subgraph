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
}

let network: string = dataSource.network();

let vaultAddressByNetwork: AddressByNetwork = {
  velas: '0xA4A48dfcAE6490AfE9C779BF0f324B48683e488c'
};

let wethAddressByNetwork: AddressByNetwork = {
  velas: '0x6ab6d61428fde76768d7b45d8bfeec19c6ef91a8'
};

let wbtcAddressByNetwork: AddressByNetwork = {
  velas: '0x639a647fbe20b6c8ac19e48e2de44ea792c62c5c'
};

let usdAddressByNetwork: AddressByNetwork = {
  velas: '0xb44a9b6905af7c801311e8f4e76932ee959c663c'
};

let usdcAddressByNetwork: AddressByNetwork = {
  velas: '0x80a16016cc4a2e6a2caca8a4a498b1699ff0f844'
};

let balAddressByNetwork: AddressByNetwork = {
  velas: '0x117E0b609C7eEDafeF1A83Ad692dE52817A0B2F6'
};

let daiAddressByNetwork: AddressByNetwork = {
    velas: '0xe3f5a90f9cb311505cd691a46596599aa1a0ad7d'
};

let busdAddressByNetwork: AddressByNetwork = {
  velas: '0xc9baa8cfdde8e328787e29b4b078abf2dadc2055'
};

function forNetwork(addressByNetwork: AddressByNetwork, network: string): Address {
 if (network == 'velas'){
    return Address.fromString(addressByNetwork.velas);
  } else {
    return Address.fromString(addressByNetwork.velas);
  }
}


export let VAULT_ADDRESS = Address.fromString('0xA4A48dfcAE6490AfE9C779BF0f324B48683e488c');
export let WETH: Address = Address.fromString('0x6ab6d61428fde76768d7b45d8bfeec19c6ef91a8');
export let WBTC: Address = Address.fromString('0x639a647fbe20b6c8ac19e48e2de44ea792c62c5c');
export let USD: Address = Address.fromString('0xb44a9b6905af7c801311e8f4e76932ee959c663c');
export let USDC: Address = Address.fromString('0x80a16016cc4a2e6a2caca8a4a498b1699ff0f844');
export let BAL: Address = Address.fromString('0x117E0b609C7eEDafeF1A83Ad692dE52817A0B2F6');
export let DAI: Address = Address.fromString('0xe3f5a90f9cb311505cd691a46596599aa1a0ad7d');

export let AVAX: Address = Address.fromString('0x332730a4F6E03D9C55829435f10360E13cfA41Ff');
export let MATIC: Address = Address.fromString('0xA649325Aa7C5093d12D6F98EB4378deAe68CE23F');
export let BNB: Address = Address.fromString('0x65e66a61D0a8F1e686C2D6083ad611a10D84D97A');

export let BUSD: Address =  Address.fromString('0xc9baa8cfdde8e328787e29b4b078abf2dadc2055');

export let PRICING_ASSETS: Address[] = [WETH, AVAX, MATIC, BNB, USDC, USD, DAI, BUSD, BAL];
export let USD_STABLE_ASSETS: Address[] = [USDC, DAI, USD, BUSD];

//export let PRICING_ASSETS: Address[] = [WETH, WBTC, USDC, DAI, BAL, MIM, AUSD];
//export let USD_STABLE_ASSETS: Address[] = [USDC, DAI, AUSD, MIM];
