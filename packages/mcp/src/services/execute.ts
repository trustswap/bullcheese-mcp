import { prepareTx, revertName } from "@trustswap/bullcheese-core";
import {
  evaluatePolicy,
  type AuditRow,
  type Purpose,
  type QuoteBinding,
} from "@trustswap/bullcheese-policy";
import type { Address, Hex, TransactionReceipt } from "viem";
import type { ChainDeps, Deps } from "../deps.js";
import { redactUrls } from "../errors.js";
import { QuoteError } from "../quotes.js";

export class ToolError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ToolError";
  }
}

export function chainOrThrow(deps: Deps, chainId: number): ChainDeps {
  const c = deps.chains.get(chainId);
  if (!c) {
    throw new ToolError("unknown_chain", `chain ${chainId} is not configured; call list_chains`);
  }
  return c;
}

export interface ExecuteArgs {
  chainId: number;
  call: { to: Address; data: Hex; value: bigint };
  purpose: Purpose;
  quote: QuoteBinding;
  tool: string;
  inputs: unknown;
  extraKnownTokens?: Address[];
  extraKnownLockers?: Address[];
}

export interface ExecuteResult {
  txHash: Hex;
  receipt: TransactionReceipt;
}

async function safeRecord(deps: Deps, row: AuditRow): Promise<void> {
  try {
    await deps.audit.record(row);
  } catch (e) {
            console.error(
      redactUrls(
        `audit write failed (${row.outcome}): ${e instanceof Error ? e.message : String(e)}`,
      ),
    );
  }
}

const AUDITED = new WeakSet<object>();

export function markAudited<E>(error: E): E {
  if (typeof error === "object" && error !== null) AUDITED.add(error);
  return error;
}

const isAudited = (error: unknown): boolean =>
  typeof error === "object" && error !== null && AUDITED.has(error);

export interface RefusalContext {
  tool: string;
  chainId?: number;
    inputs: Record<string, unknown>;
}

function refusalCode(error: unknown): string | null {
  if (error instanceof ToolError) return error.code;
  if (error instanceof QuoteError) return `quote_${error.reason}`;
  return null;
}

function refusalChainId(deps: Deps, explicit: number | undefined): number | undefined {
  if (explicit !== undefined) return explicit;
  for (const id of deps.chains.keys()) {
    if (deps.profileFor(id).chainIds.has(id)) return id;
  }
  return deps.chains.keys().next().value;
}

export async function auditRefusals<T>(
  deps: Deps,
  ctx: RefusalContext,
  run: () => Promise<T>,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    const code = refusalCode(error);
    if (code === null || isAudited(error)) throw error;
    const chainId = refusalChainId(deps, ctx.chainId);
            if (chainId !== undefined) {
      try {
        await safeRecord(deps, {
          ts: deps.now(),
          runId: deps.identity.runId,
          personaId: deps.identity.personaId,
          wallet: await deps.signer.address(chainId),
          chainId,
          tool: ctx.tool,
          inputs: ctx.inputs,
          outcome: "error",
          error: code,
        });
      } catch {
                      }
    }
    throw error;
  }
}

export async function executeTx(deps: Deps, args: ExecuteArgs): Promise<ExecuteResult> {
  const chain = chainOrThrow(deps, args.chainId);
  const wallet = await deps.signer.address(args.chainId);

              const lockKey = `${wallet.toLowerCase()}:${args.chainId}`;
  const previous = deps.locks.get(lockKey) ?? Promise.resolve();
  const run = previous.then(async () => {
    const ts = deps.now();
    const base = {
      ts,
      runId: deps.identity.runId,
      personaId: deps.identity.personaId,
      wallet,
      chainId: args.chainId,
      tool: args.tool,
      inputs: args.inputs,
      quoteId: args.quote.id,
      purpose: args.purpose,
    };

    const launched = await deps.audit.launchedTokens(wallet, args.chainId);
    const knownTokens = new Set<Address>(
      [...launched, ...(args.extraKnownTokens ?? [])].map((a) => a.toLowerCase() as Address),
    );
    const knownLockers = new Set<Address>(
      (args.extraKnownLockers ?? []).map((a) => a.toLowerCase() as Address),
    );
    const spent24h = await deps.audit.sumSpendSince(wallet, args.chainId, ts - 86_400);
    const decision = evaluatePolicy(
      {
        ...args.call,
        chainId: args.chainId,
        from: wallet,
        purpose: args.purpose,
        quote: args.quote,
      },
      {
        cfg: chain.cfg,
        wallet,
        profile: deps.profileFor(args.chainId),
        knownTokens,
        knownLockers,
        nowSeconds: ts,
        spent24h,
      },
    );
    if (!decision.allowed) {
      await safeRecord(deps, {
        ...base,
        outcome: "denied",
        error: `${decision.check}: ${decision.reason}`,
      });
      throw markAudited(
        new ToolError(
          "policy_denied",
          `policy check "${decision.check}" denied: ${decision.reason}`,
          {
            check: decision.check,
          },
        ),
      );
    }

    let sent: ExecuteResult;
    try {
      const unsigned = await prepareTx(chain.client, {
        chainId: args.chainId,
        from: wallet,
        to: args.call.to,
        data: args.call.data,
        value: args.call.value,
      });
      const signed = await deps.signer.signTransaction(args.chainId, unsigned);
      const txHash = await chain.client.sendRawTransaction({ serializedTransaction: signed });
      const receipt = await chain.client.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== "success") {
        await safeRecord(deps, { ...base, outcome: "error", txHash, error: "reverted on chain" });
        throw markAudited(new ToolError("tx_failed", `transaction ${txHash} reverted`, { txHash }));
      }
      sent = { txHash, receipt };
    } catch (e) {
      if (e instanceof ToolError) throw e;
      const name = revertName(e);
            const cause = redactUrls(String(e));
      await safeRecord(deps, { ...base, outcome: "error", error: name ?? cause });
      throw markAudited(
        new ToolError(
          "tx_failed",
          name ? `reverted with ${name}` : `transaction failed: ${cause}`,
          {
            revertName: name,
          },
        ),
      );
    }

                    await safeRecord(deps, { ...base, outcome: "ok", txHash: sent.txHash, spend: decision.spend });
    return sent;
  });
  deps.locks.set(
    lockKey,
    run.catch(() => undefined),
  );
  return run;
}
