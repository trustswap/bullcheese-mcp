import pg from "pg";
import type { Address, Hex } from "viem";
import { AUDIT_COLUMNS, hydrateAuditRow, type RawAuditRow } from "./row.js";
import type { AuditRow, AuditStore, LaunchRecord, SaltStatus } from "./types.js";

const SCHEMA_VERSION_TABLE = `
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at BIGINT NOT NULL
);
`;

const V1 = `
CREATE TABLE IF NOT EXISTS audit (
  id BIGSERIAL PRIMARY KEY,
  ts BIGINT NOT NULL,
  run_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  wallet TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  tool TEXT NOT NULL,
  inputs JSONB NOT NULL,
  quote_id TEXT,
  tx_hash TEXT,
  outcome TEXT NOT NULL,
  error TEXT,
  purpose TEXT,
  spend NUMERIC(78,0)
);
CREATE INDEX IF NOT EXISTS audit_spend ON audit (wallet, chain_id, outcome, ts);
CREATE TABLE IF NOT EXISTS salts (
  wallet TEXT NOT NULL, chain_id INTEGER NOT NULL, salt TEXT NOT NULL, status TEXT NOT NULL,
  PRIMARY KEY (wallet, chain_id, salt)
);
CREATE TABLE IF NOT EXISTS launches (
  wallet TEXT NOT NULL, chain_id INTEGER NOT NULL, token TEXT NOT NULL, tx_hash TEXT NOT NULL, ts BIGINT NOT NULL,
  PRIMARY KEY (chain_id, token)
);
CREATE INDEX IF NOT EXISTS launches_wallet ON launches (wallet, chain_id, ts);
`;

const MIGRATIONS: ReadonlyArray<{ version: number; sql: string }> = [{ version: 1, sql: V1 }];

export class PostgresAuditStore implements AuditStore {
  private readonly pool: Pick<pg.Pool, "query" | "end">;
  private ready: Promise<void> | null = null;

  constructor(connectionString: string, pool?: Pick<pg.Pool, "query" | "end">) {
    this.pool = pool ?? new pg.Pool({ connectionString, max: 4 });
  }

  private ensure(): Promise<void> {
    if (!this.ready) {
      this.ready = this.migrate().catch((err: unknown) => {
                        this.ready = null;
        throw err;
      });
    }
    return this.ready;
  }

    private async migrate(): Promise<void> {
    await this.pool.query(SCHEMA_VERSION_TABLE);
    const { rows } = await this.pool.query<{ version: number }>(
      `SELECT version FROM schema_version`,
    );
    const applied = new Set(rows.map((r) => Number(r.version)));
    for (const migration of MIGRATIONS) {
      if (applied.has(migration.version)) continue;
      await this.pool.query(migration.sql);
      await this.pool.query(
        `INSERT INTO schema_version (version, applied_at) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING`,
        [migration.version, Math.floor(Date.now() / 1000)],
      );
    }
  }

  async record(row: AuditRow): Promise<void> {
    await this.ensure();
    await this.pool.query(
      `INSERT INTO audit (ts, run_id, persona_id, wallet, chain_id, tool, inputs, quote_id, tx_hash, outcome, error, purpose, spend)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
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
      ],
    );
  }

  async sumSpendSince(wallet: Address, chainId: number, sinceTs: number): Promise<bigint> {
    await this.ensure();
    const { rows } = await this.pool.query<{ total: string | null }>(
      `SELECT COALESCE(SUM(spend), 0)::text AS total FROM audit
       WHERE wallet = $1 AND chain_id = $2 AND outcome = 'ok' AND ts >= $3 AND spend IS NOT NULL`,
      [wallet.toLowerCase(), chainId, sinceTs],
    );
    return BigInt(rows[0]?.total ?? "0");
  }

  async markSalt(wallet: Address, chainId: number, salt: Hex, status: SaltStatus): Promise<void> {
    await this.ensure();
    await this.pool.query(
      `INSERT INTO salts (wallet, chain_id, salt, status) VALUES ($1,$2,$3,$4)
       ON CONFLICT (wallet, chain_id, salt) DO UPDATE SET status = EXCLUDED.status`,
      [wallet.toLowerCase(), chainId, salt.toLowerCase(), status],
    );
  }

  async saltUsed(wallet: Address, chainId: number, salt: Hex): Promise<boolean> {
    await this.ensure();
    const { rowCount } = await this.pool.query(
      `SELECT 1 FROM salts WHERE wallet = $1 AND chain_id = $2 AND salt = $3`,
      [wallet.toLowerCase(), chainId, salt.toLowerCase()],
    );
    return (rowCount ?? 0) > 0;
  }

  async recordLaunch(rec: LaunchRecord): Promise<void> {
    await this.ensure();
    await this.pool.query(
      `INSERT INTO launches (wallet, chain_id, token, tx_hash, ts) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (chain_id, token) DO UPDATE SET wallet = EXCLUDED.wallet, tx_hash = EXCLUDED.tx_hash, ts = EXCLUDED.ts`,
      [rec.wallet.toLowerCase(), rec.chainId, rec.token.toLowerCase(), rec.txHash, rec.ts],
    );
  }

  async launchedTokens(wallet: Address, chainId: number): Promise<Address[]> {
    await this.ensure();
    const { rows } = await this.pool.query<{ token: Address }>(
      `SELECT token FROM launches WHERE wallet = $1 AND chain_id = $2 ORDER BY ts`,
      [wallet.toLowerCase(), chainId],
    );
    return rows.map((r) => r.token);
  }

  async rowsForRun(runId: string): Promise<AuditRow[]> {
    await this.ensure();
            const { rows } = await this.pool.query<RawAuditRow>(
      `SELECT ${AUDIT_COLUMNS} FROM audit WHERE run_id = $1 ORDER BY id`,
      [runId],
    );
    return rows.map(hydrateAuditRow);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
