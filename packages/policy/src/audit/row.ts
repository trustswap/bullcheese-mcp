import type { Address, Hex } from "viem";
import type { Purpose } from "../types.js";
import type { AuditRow } from "./types.js";

export interface RawAuditRow {
  ts: number | string;
  run_id: string;
  persona_id: string;
  wallet: string;
  chain_id: number | string;
  tool: string;
  inputs: unknown;
  quote_id: string | null;
  tx_hash: string | null;
  outcome: string;
  error: string | null;
  purpose: string | null;
  spend: string | null;
}

export function hydrateAuditRow(raw: RawAuditRow): AuditRow {
  return {
    ts: Number(raw.ts),
    runId: raw.run_id,
    personaId: raw.persona_id,
    wallet: raw.wallet as Address,
    chainId: Number(raw.chain_id),
    tool: raw.tool,
    inputs: typeof raw.inputs === "string" ? (JSON.parse(raw.inputs) as unknown) : raw.inputs,
    ...(raw.quote_id === null ? {} : { quoteId: raw.quote_id }),
    ...(raw.tx_hash === null ? {} : { txHash: raw.tx_hash as Hex }),
    outcome: raw.outcome as AuditRow["outcome"],
    ...(raw.error === null ? {} : { error: raw.error }),
    ...(raw.purpose === null ? {} : { purpose: raw.purpose as Purpose }),
    ...(raw.spend === null ? {} : { spend: BigInt(raw.spend) }),
  };
}

export const AUDIT_COLUMNS =
  "ts, run_id, persona_id, wallet, chain_id, tool, inputs, quote_id, tx_hash, outcome, error, purpose, spend";
