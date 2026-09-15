import { formatUnits, parseUnits } from "viem";

export function parseAmount(input: string, decimals: number): bigint | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;

        if (!/^\d*\.?\d*$/.test(trimmed) || trimmed === ".") return null;

    const [whole, fraction = ""] = trimmed.split(".");
  const truncated = fraction.slice(0, decimals);
  const normalised = truncated === "" ? whole || "0" : `${whole || "0"}.${truncated}`;

  const parsed = parseUnits(normalised, decimals);
  return parsed > 0n ? parsed : null;
}

export function formatAmount(raw: bigint | undefined, decimals: number, places = 6): string {
  if (raw === undefined) return "—";

  const whole = formatUnits(raw, decimals);
  const [intPart, fracPart = ""] = whole.split(".");
  const cut = fracPart.slice(0, places).replace(/0+$/, "");

  const grouped = Number(intPart).toLocaleString("en-US");
  return cut === "" ? grouped : `${grouped}.${cut}`;
}

export function pricePerToken(
  sellRaw: bigint,
  sellDecimals: number,
  buyRaw: bigint,
  buyDecimals: number,
): number | null {
  if (sellRaw <= 0n) return null;

  const sell = Number(formatUnits(sellRaw, sellDecimals));
  const buy = Number(formatUnits(buyRaw, buyDecimals));
  if (!Number.isFinite(sell) || !Number.isFinite(buy) || sell === 0) return null;

  return buy / sell;
}

export const SLIPPAGE_PRESETS_BPS = [50, 100, 300] as const;

export const DEFAULT_SLIPPAGE_BPS = 100;

export function formatSlippage(bps: number): string {
  return `${String(Number((bps / 100).toFixed(2)))}%`;
}
