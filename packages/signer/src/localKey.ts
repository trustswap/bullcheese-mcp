import type { Address, Hex, TransactionSerializable } from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { SignerError, type Signer } from "./index.js";

export class LocalKeySigner implements Signer {
  private readonly account: PrivateKeyAccount;
  private readonly permitted: ReadonlySet<number>;

  constructor(opts: { privateKey: Hex; permittedChainIds: ReadonlySet<number> }) {
    this.account = privateKeyToAccount(opts.privateKey);
    this.permitted = opts.permittedChainIds;
  }

  private guard(chainId: number): void {
    if (!this.permitted.has(chainId)) {
      throw new SignerError(
        "chain_not_permitted",
        `LocalKeySigner will not sign for chain ${chainId}; permitted: ${[...this.permitted].join(", ")}`,
      );
    }
  }

  async address(chainId: number): Promise<Address> {
    this.guard(chainId);
    return this.account.address;
  }

  async signTransaction(chainId: number, tx: TransactionSerializable): Promise<Hex> {
    this.guard(chainId);
    if (tx.chainId !== undefined && tx.chainId !== chainId) {
      throw new SignerError(
        "chain_not_permitted",
        `transaction chainId ${tx.chainId} does not match ${chainId}`,
      );
    }
    try {
      return await this.account.signTransaction(tx);
    } catch (cause) {
      throw new SignerError("signing_failed", `local key could not sign: ${String(cause)}`);
    }
  }

  async signMessage(chainId: number, message: string): Promise<Hex> {
    this.guard(chainId);
    try {
      return await this.account.signMessage({ message });
    } catch (cause) {
      throw new SignerError("signing_failed", `local key could not sign: ${String(cause)}`);
    }
  }
}
