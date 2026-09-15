import { randomUUID } from "node:crypto";
import type { DeployConfig } from "@trustswap/bullcheese-core";
import type { Address, Hex } from "viem";

export interface LaunchInput {
  chainId: number;
  name: string;
  symbol: string;
  decimals: number;
  marketCapPreset: "20K" | "5K";
  lockPreset: "3M" | "6M" | "1Y" | "3Y" | "5Y";
    devBuy?: string;
}

export interface LaunchMetadata {
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
}

export interface LaunchQuote {
  kind: "launch";
  id: string;
  chainId: number;
  wallet: Address;
  expiresAt: number;
  input: LaunchInput;
  salt: Hex;
  predictedToken: Address;
  deployConfig: DeployConfig;
    pairUsd: number;
  metadata?: LaunchMetadata;
  metadataIpfsHash?: string;
  devBuy?: { amountIn: bigint };
}

export interface SwapQuote {
  kind: "swap";
  id: string;
  chainId: number;
  wallet: Address;
  expiresAt: number;
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  expectedOut: bigint;
  payNative: boolean;
  needsApproval: boolean;
}

export type Quote = LaunchQuote | SwapQuote;
type NewQuote = Omit<LaunchQuote, "id" | "expiresAt"> | Omit<SwapQuote, "id" | "expiresAt">;

export class QuoteError extends Error {
  constructor(
    readonly reason: "unknown" | "expired",
    id: string,
  ) {
    super(
      reason === "expired" ? `quote ${id} expired; request a new quote` : `quote ${id} is unknown`,
    );
    this.name = "QuoteError";
  }
}

export const QUOTE_TTL_SECONDS = 60;

export class QuoteStore {
  private readonly quotes = new Map<string, Quote>();

  constructor(
    private readonly now: () => number,
    private readonly ttlSeconds = QUOTE_TTL_SECONDS,
  ) {}

  put(q: NewQuote): Quote {
    const quote = { ...q, id: randomUUID(), expiresAt: this.now() + this.ttlSeconds } as Quote;
    this.quotes.set(quote.id, quote);
    return quote;
  }

  take(id: string): Quote {
    const q = this.quotes.get(id);
    if (!q) throw new QuoteError("unknown", id);
    this.quotes.delete(id);
    if (q.expiresAt <= this.now()) throw new QuoteError("expired", id);
    return q;
  }
}
