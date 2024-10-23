import { Claim } from '../types/schema';
import { Claimed } from '../types/ProfitDistribution/ProfitDistribution';
import { PROFIT_DISTRIBUTION_ADDRESS } from './helpers/constants';
import { BigDecimal, Bytes, ethereum } from '@graphprotocol/graph-ts';
import { log } from '@graphprotocol/graph-ts';
export function handleClaim(event: Claimed): void {
  let id = `${event.transaction.hash.toHexString()}-${event.transaction.from.toHexString()}`;
  let claim = new Claim(id);
  claim.address = event.transaction.from;
  claim.tx = event.transaction.hash;
  claim.timestamp = event.block.timestamp.toI32();
  claim.amounts = event.parameters[2].value.toBigIntArray().map<BigDecimal>((item) => {
    return item.toBigDecimal();
  });
  let tokens = new Array<Bytes>();
  if (event.receipt != null) {
    let receipt: ethereum.TransactionReceipt = event.receipt as ethereum.TransactionReceipt;
    for (let i = 0; i < receipt.logs.length; i++) {
      let _log = receipt.logs[i];
      if (
        _log.topics[0].toHexString().toLowerCase() ==
        '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
      ) {
        let fromAddress = _log.topics[1].toHexString().replace('0x000000000000000000000000', '0x').toLowerCase();

        if (fromAddress.toLowerCase() == PROFIT_DISTRIBUTION_ADDRESS.toHexString().toLowerCase()) {
          tokens.push(_log.address);
        }
      }
    }
  }
  claim.tokens = tokens;
  claim.save();
}
