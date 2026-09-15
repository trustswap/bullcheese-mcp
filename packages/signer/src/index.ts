import type { Address, Hex, TransactionSerializable } from "viem";

export interface Signer {
  address(chainId: number): Promise<Address>;
  signTransaction(chainId: number, tx: TransactionSerializable): Promise<Hex>;
    signMessage(chainId: number, message: string): Promise<Hex>;
}

export type SignerErrorCode = "chain_not_permitted" | "signing_failed";

export class SignerError extends Error {
  constructor(
    readonly code: SignerErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SignerError";
  }
}

export { LocalKeySigner } from "./localKey.js";
