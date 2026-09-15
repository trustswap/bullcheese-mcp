import type { Address, Hex } from "viem";
import type { Purpose } from "../types.js";

export interface AuditRow {
    ts: number;
  runId: string;
  personaId: string;
  wallet: Address;
  chainId: number;
  tool: string;
  inputs: unknown;
  quoteId?: string;
  txHash?: Hex;
  outcome: "ok" | "denied" | "error";
  error?: string;
  purpose?: Purpose;
    spend?: bigint;
}

export interface LaunchRecord {
  wallet: Address;
  chainId: number;
  token: Address;
  txHash: Hex;
  ts: number;
}

export type SaltStatus = "pending" | "consumed" | "failed";

export interface AuditStore {
  record(row: AuditRow): Promise<void>;
  sumSpendSince(wallet: Address, chainId: number, sinceTs: number): Promise<bigint>;
  markSalt(wallet: Address, chainId: number, salt: Hex, status: SaltStatus): Promise<void>;
  saltUsed(wallet: Address, chainId: number, salt: Hex): Promise<boolean>;
  recordLaunch(rec: LaunchRecord): Promise<void>;
  launchedTokens(wallet: Address, chainId: number): Promise<Address[]>;
    rowsForRun(runId: string): Promise<AuditRow[]>;
  close(): Promise<void>;
}
