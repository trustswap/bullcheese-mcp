import type { Address, Hex } from "viem";
import type { Deps } from "../deps.js";
import type {
  CandleTimeframe,
  ExploreParams,
  ExploreResult,
  MintPlusLaunch,
  MintPlusLaunchDetail,
  MintPlusLaunchWithMarket,
} from "../tfApi/query.js";
import { ToolError } from "./execute.js";

const MAX_ENTRIES = 50;
const TIMEFRAMES: readonly CandleTimeframe[] = ["5m", "1h", "4h", "1d"];

function requireTfApiQuery(deps: Deps): NonNullable<Deps["tfApiQuery"]> {
  if (!deps.tfApiQuery) {
    throw new ToolError(
      "invalid_input",
      "Team Finance API reads are disabled (BULLCHEESE_TF_API_QUERY_URL is empty)",
    );
  }
  return deps.tfApiQuery;
}

function dropId<T extends object>(row: T): T {
  const rest = { ...(row as Record<string, unknown>) };
  delete rest._id;
  return rest as T;
}

function cap<T>(items: readonly T[]): { items: T[]; truncated: boolean } {
  if (items.length <= MAX_ENTRIES) return { items: [...items], truncated: false };
  return { items: items.slice(0, MAX_ENTRIES), truncated: true };
}

type Trades = NonNullable<MintPlusLaunchWithMarket["trades"]>;
type Holders = NonNullable<MintPlusLaunchWithMarket["holders"]>;
type Candles = NonNullable<MintPlusLaunchDetail["candles"]>;

function capTrades(trades: Trades | undefined): Trades | undefined {
  if (!trades) return trades;
  const { items, truncated } = cap(trades.trades);
  return { ...trades, trades: items, ...(truncated ? { truncated: true } : {}) };
}

function capHolders(holders: Holders | undefined): Holders | undefined {
  if (!holders?.top) return holders;
  const { items, truncated } = cap(holders.top.holders);
  return {
    ...holders,
    top: { ...holders.top, holders: items, ...(truncated ? { truncated: true } : {}) },
  };
}

function capCandles(candles: Candles | undefined): Candles | undefined {
  if (!candles) return candles;
  const { items, truncated } = cap(candles.series);
  return { ...candles, series: items, ...(truncated ? { truncated: true } : {}) };
}

function shapeLaunch(launch: MintPlusLaunchWithMarket): MintPlusLaunchWithMarket {
  const base = dropId(launch);
  return {
    ...base,
    ...(base.trades ? { trades: capTrades(base.trades) } : {}),
    ...(base.holders ? { holders: capHolders(base.holders) } : {}),
  };
}

export async function exploreLaunches(deps: Deps, input: ExploreParams): Promise<ExploreResult> {
  const api = requireTfApiQuery(deps);
  if (input.limit !== undefined && (input.limit < 1 || input.limit > 100)) {
    throw new ToolError("invalid_input", "limit must be between 1 and 100");
  }
  const result = await api.explore(input);
  return { ...result, items: result.items.map(shapeLaunch) };
}

export async function getLaunchesByOwner(
  deps: Deps,
  address: Address | string,
  chainId?: number,
): Promise<MintPlusLaunch[]> {
  const api = requireTfApiQuery(deps);
  const rows = await api.launchesByOwner(address, chainId);
  return rows.map(dropId);
}

export async function getLaunchByToken(
  deps: Deps,
  token: Address | string,
  chainId: number,
): Promise<MintPlusLaunchWithMarket | null> {
  const api = requireTfApiQuery(deps);
  const row = await api.launchByToken(token, chainId);
  return row ? shapeLaunch(row) : null;
}

export async function getLaunchDetail(
  deps: Deps,
  chainId: number,
  txHash: Hex,
  timeframe?: string,
): Promise<MintPlusLaunchDetail | null> {
  const api = requireTfApiQuery(deps);
  if (timeframe !== undefined && !TIMEFRAMES.includes(timeframe as CandleTimeframe)) {
    throw new ToolError("invalid_input", `timeframe must be one of ${TIMEFRAMES.join(", ")}`);
  }
  const detail = await api.launchDetail(chainId, txHash, timeframe as CandleTimeframe | undefined);
  if (!detail) return null;
  return {
    launch: detail.launch ? shapeLaunch(detail.launch) : null,
    fees: detail.fees.map((f) => dropId(f as object)),
    ...(detail.candles ? { candles: capCandles(detail.candles) } : {}),
    ...(detail.trades ? { trades: capTrades(detail.trades) } : {}),
    ...(detail.holders ? { holders: capHolders(detail.holders) } : {}),
  };
}
