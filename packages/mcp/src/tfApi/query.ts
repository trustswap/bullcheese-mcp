import type { Address, Hex } from "viem";
import { z } from "zod";
import { redactUrls } from "../errors.js";
import { ToolError } from "../services/execute.js";
import { ApiError, apiFetch, hexChainId } from "./client.js";

const launchSchema = z
  .object({
    chainId: z.string(),
    createdAt: z.string(),
    status: z.enum(["LIVE", "INDEXING", "WITHDRAWN", "PENDING_SAFE"]).nullish(),
    txHash: z.string().nullish(),
    token: z.string().nullish(),
    pool: z.string().nullish(),
    locker: z.string().nullish(),
    tokenId: z.string().nullish(),
    lockId: z.string().nullish(),
    tokenName: z.string().nullish(),
    tokenSymbol: z.string().nullish(),
    tokenDecimals: z.number().nullish(),
    tokenTotalSupply: z.string().nullish(),
    sqrtPriceX96: z.string().nullish(),
    withdrawalAddress: z.string().nullish(),
    unlockTime: z.number().nullish(),
  })
  .passthrough();
export type MintPlusLaunch = z.infer<typeof launchSchema>;

const launchListSchema = z.array(z.unknown()).transform((rows) =>
  rows.flatMap((r) => {
    const p = launchSchema.safeParse(r);
    return p.success ? [p.data] : [];
  }),
);

const tradesSchema = z
  .object({
    trades: z
      .array(z.record(z.string(), z.unknown()))
      .nullish()
      .transform((t) => t ?? []),
    source: z.string().optional(),
  })
  .passthrough();

const holdersSchema = z
  .object({
    source: z.string().optional(),
    count: z.number().nullable().optional(),
    distributionPct: z.record(z.string(), z.unknown()).nullable().optional(),
    lastUpdated: z.string().nullable().optional(),
    developerHoldingPct: z.number().nullable().optional(),
    top: z
      .object({
        source: z.string().optional(),
        lastUpdated: z.string().nullable().optional(),
        holders: z
          .array(z.record(z.string(), z.unknown()))
          .nullish()
          .transform((h) => h ?? []),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const candlesSchema = z
  .object({
    timeframe: z.string().optional(),
    series: z
      .array(z.array(z.number()))
      .nullish()
      .transform((s) => s ?? []),
    source: z.string().optional(),
  })
  .passthrough();

const launchWithMarketSchema = launchSchema.extend({
  tier: z.number().int().optional(),
  tierProgress: z.record(z.string(), z.unknown()).optional(),
  nextCohortAt: z.string().optional(),
  market: z.record(z.string(), z.unknown()).optional(),
  trades: tradesSchema.optional(),
  holders: holdersSchema.optional(),
});
export type MintPlusLaunchWithMarket = z.infer<typeof launchWithMarketSchema>;
export type ExploreItem = MintPlusLaunchWithMarket;

export interface ExploreResult {
  items: ExploreItem[];
  nextCursor?: string;
  page?: number;
  pageCount?: number;
  total?: number;
  withoutMarketData?: number;
}

const exploreResponseSchema = z
  .object({
    items: z.array(z.unknown()).transform((rows) =>
      rows.flatMap((r) => {
        const p = launchWithMarketSchema.safeParse(r);
        return p.success ? [p.data] : [];
      }),
    ),
    nextCursor: z.string().optional(),
    page: z.number().optional(),
    pageCount: z.number().optional(),
    total: z.number().optional(),
    withoutMarketData: z.number().optional(),
  })
  .passthrough();

export interface MintPlusLaunchDetail {
  launch: MintPlusLaunchWithMarket | null;
  fees: unknown[];
  candles?: z.infer<typeof candlesSchema>;
  trades?: z.infer<typeof tradesSchema>;
  holders?: z.infer<typeof holdersSchema>;
}

const launchDetailSchema = z.object({
  launch: z.unknown().transform((r) => {
    const p = launchWithMarketSchema.safeParse(r);
    return p.success ? p.data : null;
  }),
  fees: z
    .array(z.record(z.string(), z.unknown()))
    .nullish()
    .transform((f) => f ?? []),
  candles: candlesSchema.optional(),
  trades: tradesSchema.optional(),
  holders: holdersSchema.optional(),
});

export type ExploreSort = "createdAt" | "capUsd" | "volume24hUsd" | "liquidityUsd";
export type ExploreOrder = "asc" | "desc";
export type ExploreStatus = "INDEXING" | "LIVE" | "WITHDRAWN";
export type ExploreTier = "1" | "2";
export type CandleTimeframe = "5m" | "1h" | "4h" | "1d";

export interface ExploreParams {
  sort?: ExploreSort;
  order?: ExploreOrder;
  chainId?: number;
  status?: ExploreStatus;
  tier?: ExploreTier;
  limit?: number;
  cursor?: string;
  page?: number;
}

function mapError(e: unknown): unknown {
  if (!(e instanceof ApiError)) return e;
  if (e.status === 404) return new ToolError("not_found", "not found");
  if (e.status === 429) {
    return new ToolError("rate_limited", "Team Finance API rate limit; retry later");
  }
  if (e.status === 400) {
    const body = e.cause as { error?: string; detail?: unknown } | undefined;
    if (body?.error === "invalid_chain_id" || body?.error === "bad_request") {
      const detail = body.detail !== undefined ? ` ${JSON.stringify(body.detail)}` : "";
      return new ToolError("invalid_input", `${body.error}${detail}`);
    }
    return new ToolError("invalid_input", "bad_request");
  }
  return new ToolError("tf_api_unavailable", redactUrls(e.message));
}

export class TfApiQuery {
  constructor(private readonly opts: { baseUrl: string; fetchImpl?: typeof fetch }) {}

  private async get<T>(path: string, schema: z.ZodType<T>): Promise<T> {
    try {
      return await apiFetch(this.opts.baseUrl, path, schema, undefined, this.opts.fetchImpl);
    } catch (e) {
      throw mapError(e);
    }
  }

  async explore(params: ExploreParams = {}): Promise<ExploreResult> {
    const qs = new URLSearchParams();
    if (params.sort !== undefined) qs.set("sort", params.sort);
    if (params.order !== undefined) qs.set("order", params.order);
    if (params.chainId !== undefined) qs.set("chainId", hexChainId(params.chainId));
    if (params.status !== undefined) qs.set("status", params.status);
    if (params.tier !== undefined) qs.set("tier", params.tier);
    if (params.limit !== undefined) qs.set("limit", String(params.limit));
    if (params.cursor !== undefined) qs.set("cursor", params.cursor);
    if (params.page !== undefined) qs.set("page", String(params.page));
    const suffix = qs.size > 0 ? `?${qs.toString()}` : "";
    return this.get(`/query/mintplus/explore${suffix}`, exploreResponseSchema);
  }

  async launchesByOwner(address: Address | string, chainId?: number): Promise<MintPlusLaunch[]> {
    const query = chainId === undefined ? "" : `?chainId=${hexChainId(chainId)}`;
    return this.get(`/query/mintplus/by-owner/${address}${query}`, launchListSchema);
  }

    async launchByToken(
    token: Address | string,
    chainId: number,
  ): Promise<MintPlusLaunchWithMarket | null> {
    try {
      return await this.get(
        `/query/mintplus/by-token/${token}/${hexChainId(chainId)}`,
        launchWithMarketSchema,
      );
    } catch (e) {
      if (e instanceof ToolError && e.code === "not_found") return null;
      throw e;
    }
  }

    async launchDetail(
    chainId: number,
    txHash: Hex,
    timeframe?: CandleTimeframe,
  ): Promise<MintPlusLaunchDetail | null> {
    const query = timeframe !== undefined ? `?timeframe=${timeframe}` : "";
    try {
      return await this.get(
        `/query/mintplus/${hexChainId(chainId)}/${txHash}${query}`,
        launchDetailSchema,
      );
    } catch (e) {
      if (e instanceof ToolError && e.code === "not_found") return null;
      throw e;
    }
  }
}
