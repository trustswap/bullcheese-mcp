import type { Address, Hex } from "viem";
import type { AuditRow, AuditStore, LaunchRecord, SaltStatus } from "./types.js";

const key = (wallet: Address, chainId: number) => `${wallet.toLowerCase()}:${chainId}`;

export class MemoryAuditStore implements AuditStore {
  readonly rows: AuditRow[] = [];
  private readonly salts = new Map<string, SaltStatus>();
  private readonly launches: LaunchRecord[] = [];

  async record(row: AuditRow): Promise<void> {
    this.rows.push({ ...row, wallet: row.wallet.toLowerCase() as Address });
  }

  async sumSpendSince(wallet: Address, chainId: number, sinceTs: number): Promise<bigint> {
    return this.rows
      .filter(
        (r) =>
          r.wallet === wallet.toLowerCase() &&
          r.chainId === chainId &&
          r.outcome === "ok" &&
          r.ts >= sinceTs,
      )
      .reduce((acc, r) => acc + (r.spend ?? 0n), 0n);
  }

  async markSalt(wallet: Address, chainId: number, salt: Hex, status: SaltStatus): Promise<void> {
    this.salts.set(`${key(wallet, chainId)}:${salt.toLowerCase()}`, status);
  }

  async saltUsed(wallet: Address, chainId: number, salt: Hex): Promise<boolean> {
    return this.salts.has(`${key(wallet, chainId)}:${salt.toLowerCase()}`);
  }

  async recordLaunch(rec: LaunchRecord): Promise<void> {
                const next: LaunchRecord = {
      ...rec,
      wallet: rec.wallet.toLowerCase() as Address,
      token: rec.token.toLowerCase() as Address,
    };
    const at = this.launches.findIndex((l) => l.chainId === next.chainId && l.token === next.token);
    if (at === -1) this.launches.push(next);
    else this.launches[at] = next;
  }

  async launchedTokens(wallet: Address, chainId: number): Promise<Address[]> {
    return this.launches
      .filter((l) => l.wallet === wallet.toLowerCase() && l.chainId === chainId)
      .sort((a, b) => a.ts - b.ts)
      .map((l) => l.token);
  }

  async rowsForRun(runId: string): Promise<AuditRow[]> {
    return this.rows.filter((r) => r.runId === runId).map((r) => ({ ...r }));
  }

  async close(): Promise<void> {}
}
