import type { Address, Hex, PublicClient, TransactionSerializable } from "viem";

export interface UnsignedTx {
  chainId: number;
  from: Address;
  to: Address;
  data: Hex;
  value: bigint;
}

const GAS_MARGIN_NUM = 12n;
const GAS_MARGIN_DEN = 10n;

export async function prepareTx(
  client: PublicClient,
  tx: UnsignedTx,
): Promise<TransactionSerializable> {
  const [nonce, gasEstimate, fees] = await Promise.all([
    client.getTransactionCount({ address: tx.from, blockTag: "pending" }),
    client.estimateGas({ account: tx.from, to: tx.to, data: tx.data, value: tx.value }),
    client.estimateFeesPerGas(),
  ]);
  return {
    type: "eip1559",
    chainId: tx.chainId,
    to: tx.to,
    data: tx.data,
    value: tx.value,
    nonce,
    gas: (gasEstimate * GAS_MARGIN_NUM) / GAS_MARGIN_DEN,
    maxFeePerGas: fees.maxFeePerGas,
    maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
  };
}
