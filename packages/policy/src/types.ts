import type { MintPlusContractConfig } from "@trustswap/bullcheese-core";
import type { Address, Hex } from "viem";

export type Purpose = "launch" | "swap" | "approve" | "collect";

export interface QuoteBinding {
  id: string;
    expiresAt: number;
    expectedOut?: bigint;
  slippageBps?: number;
    amountIn?: bigint;
}

export interface SignRequest {
  chainId: number;
  from: Address;
  to: Address;
  data: Hex;
  value: bigint;
  purpose: Purpose;
  quote: QuoteBinding;
}

export interface PolicyProfile {
  chainIds: ReadonlySet<number>;
    /** Raw pair-token units; null means no cap. */
    txCap: bigint | null;
    dailyCap: bigint | null;
  slippageMinBps: number;
  slippageMaxBps: number;
}

export interface PolicyContext {
  cfg: MintPlusContractConfig;
  wallet: Address;
  profile: PolicyProfile;
    knownTokens: ReadonlySet<Address>;
    knownLockers: ReadonlySet<Address>;
  nowSeconds: number;
    spent24h: bigint;
}

export type PolicyCheck =
  | "chain"
  | "quote"
  | "destination"
  | "selector"
  | "arguments"
  | "value_cap"
  | "daily_cap";

export type PolicyDecision =
  { allowed: true; spend: bigint } | { allowed: false; check: PolicyCheck; reason: string };
