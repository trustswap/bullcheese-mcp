import type { Deps } from "./deps.js";
import { chainOrThrow, ToolError } from "./services/execute.js";

const COINGECKO = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd";

export function pairUsdFor(
  deps: Deps,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 10_000,
) {
  const cache = new Map<number, { value: number; at: number }>();
  return async (chainId: number): Promise<number> => {
    const chain = chainOrThrow(deps, chainId);
    const override = env[`BULLCHEESE_PAIR_USD_${chainId}`];
    if (override) {
      const parsed = Number(override);
      if (!Number.isFinite(parsed)) {
        throw new ToolError("price_unavailable", `BULLCHEESE_PAIR_USD_${chainId} is not a number`);
      }
      return parsed;
    }
    if (chain.cfg.pairToken.kind === "stablecoin") return 1;
    const hit = cache.get(chainId);
    if (hit && deps.now() - hit.at < 60) return hit.value;

    let body: { ethereum?: { usd?: number } };
    try {
                  const res = await fetchImpl(COINGECKO, { signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) {
        throw new ToolError("price_unavailable", `ETH/USD fetch failed with ${res.status}`);
      }
      body = (await res.json()) as { ethereum?: { usd?: number } };
    } catch (e) {
                              if (e instanceof ToolError) throw e;
      throw new ToolError("price_unavailable", `ETH/USD fetch failed: ${String(e)}`);
    }

    const value = body.ethereum?.usd;
    if (!value) throw new ToolError("price_unavailable", "ETH/USD missing from price response");
    cache.set(chainId, { value, at: deps.now() });
    return value;
  };
}
