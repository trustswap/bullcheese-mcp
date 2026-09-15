const DAY = 24 * 60 * 60;

export interface LockPreset {
  label: "3M" | "6M" | "1Y" | "3Y" | "5Y";
  seconds: number;
}

export const LOCK_PRESETS: LockPreset[] = [
  { label: "3M", seconds: 90 * DAY },
  { label: "6M", seconds: 180 * DAY },
  { label: "1Y", seconds: 365 * DAY },
  { label: "3Y", seconds: 1095 * DAY },
  { label: "5Y", seconds: 1825 * DAY },
];

export const DEFAULT_LOCK_PRESET: LockPreset = LOCK_PRESETS[0]!;

export function presetToUnlockTime(seconds: number, nowSeconds: number): number {
  return nowSeconds + seconds;
}
