import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { Address, Hex } from "viem";
import { AUDIT_COLUMNS, hydrateAuditRow, type RawAuditRow } from "./row.js";
import type { AuditRow, AuditStore, LaunchRecord, SaltStatus } from "./types.js";

const SCHEMA_VERSION_TABLE = `
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL
);
`;

const V1 = `
CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  run_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  wallet TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  tool TEXT NOT NULL,
  inputs TEXT NOT NULL,
  quote_id TEXT,
  tx_hash TEXT,
  outcome TEXT NOT NULL,
  error TEXT,
  purpose TEXT,
  spend TEXT
);
CREATE INDEX IF NOT EXISTS audit_spend ON audit (wallet, chain_id, outcome, ts);
CREATE TABLE IF NOT EXISTS salts (
  wallet TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  salt TEXT NOT NULL,
  status TEXT NOT NULL,
  PRIMARY KEY (wallet, chain_id, salt)
);
CREATE TABLE IF NOT EXISTS launches (
  wallet TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  token TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  ts INTEGER NOT NULL,
  PRIMARY KEY (chain_id, token)
);
`;

const MIGRATIONS: ReadonlyArray<{ version: number; sql: string }> = [{ version: 1, sql: V1 }];

export class SqliteAuditStore implements AuditStore {
  private readonly db: DatabaseSync;

  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.ensure();
  }

    private ensure(): void {
    this.db.exec(SCHEMA_VERSION_TABLE);
    const applied = new Set(
      (
        this.db.prepare(`SELECT version FROM schema_version`).all() as Array<{ version: number }>
      ).map((r) => Number(r.version)),
    );
    for (const migration of MIGRATIONS) {
      if (applied.has(migration.version)) continue;
      this.db.exec(migration.sql);
      this.db
        .prepare(`INSERT OR IGNORE INTO schema_version (version, applied_at) VALUES (?, ?)`)
        .run(migration.version, Math.floor(Date.now() / 1000));
    }
  }

  async record(row: AuditRow): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO audit (ts, run_id, persona_id, wallet, chain_id, tool, inputs, quote_id, tx_hash, outcome, error, purpose, spend)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        row.ts,
        row.runId,
        row.personaId,
        row.wallet.toLowerCase(),
        row.chainId,
        row.tool,
        JSON.stringify(row.inputs, (_k, v) => (typeof v === "bigint" ? v.toString() : v)),
        row.quoteId ?? null,
        row.txHash ?? null,
        row.outcome,
        row.error ?? null,
        row.purpose ?? null,
        row.spend === undefined ? null : row.spend.toString(),
      );
  }

  async sumSpendSince(wallet: Address, chainId: number, sinceTs: number): Promise<bigint> {
    const rows = this.db
      .prepare(
        `SELECT spend FROM audit WHERE wallet = ? AND chain_id = ? AND outcome = 'ok' AND ts >= ? AND spend IS NOT NULL`,
      )
      .all(wallet.toLowerCase(), chainId, sinceTs) as Array<{ spend: string }>;
    return rows.reduce((acc, r) => acc + BigInt(r.spend), 0n);
  }

  async markSalt(wallet: Address, chainId: number, salt: Hex, status: SaltStatus): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO salts (wallet, chain_id, salt, status) VALUES (?, ?, ?, ?)
         ON CONFLICT (wallet, chain_id, salt) DO UPDATE SET status = excluded.status`,
      )
      .run(wallet.toLowerCase(), chainId, salt.toLowerCase(), status);
  }

  async saltUsed(wallet: Address, chainId: number, salt: Hex): Promise<boolean> {
    const row = this.db
      .prepare(`SELECT 1 AS x FROM salts WHERE wallet = ? AND chain_id = ? AND salt = ?`)
      .get(wallet.toLowerCase(), chainId, salt.toLowerCase());
    return row !== undefined;
  }

  async recordLaunch(rec: LaunchRecord): Promise<void> {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO launches (wallet, chain_id, token, tx_hash, ts) VALUES (?, ?, ?, ?, ?)`,
      )
      .run(rec.wallet.toLowerCase(), rec.chainId, rec.token.toLowerCase(), rec.txHash, rec.ts);
  }

  async launchedTokens(wallet: Address, chainId: number): Promise<Address[]> {
    const rows = this.db
      .prepare(`SELECT token FROM launches WHERE wallet = ? AND chain_id = ? ORDER BY ts`)
      .all(wallet.toLowerCase(), chainId) as Array<{ token: Address }>;
    return rows.map((r) => r.token);
  }

  async rowsForRun(runId: string): Promise<AuditRow[]> {
            const rows = this.db
      .prepare(`SELECT ${AUDIT_COLUMNS} FROM audit WHERE run_id = ? ORDER BY id`)
      .all(runId) as unknown as RawAuditRow[];
    return rows.map(hydrateAuditRow);
  }

  async close(): Promise<void> {
    this.db.close();
  }
}
