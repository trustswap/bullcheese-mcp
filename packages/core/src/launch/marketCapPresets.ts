export interface MarketCapPreset {
  label: "20K" | "5K";
  marketCapUsd: string;
  supply: string;
}

export const MARKET_CAP_PRESETS: MarketCapPreset[] = [
  { label: "20K", marketCapUsd: "20000", supply: "1000000000" },
  { label: "5K", marketCapUsd: "5000", supply: "1000000000" },
];

export const DEFAULT_MARKET_CAP_PRESET: MarketCapPreset = MARKET_CAP_PRESETS[0]!;

export function presetTokenPriceUsd(preset: MarketCapPreset): number {
  return Number(preset.marketCapUsd) / Number(preset.supply);
}
