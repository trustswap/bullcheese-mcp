import {
  DECIMALS_MAX,
  DECIMALS_MIN,
  MIN_LOCK_DURATION_SECONDS,
  NAME_MAX_BYTES,
  SUPPLY_MAX,
  SUPPLY_MIN,
  SYMBOL_MAX_BYTES,
} from "../contracts/constants.js";

const byteLen = (s: string) => new TextEncoder().encode(s).length;

export function validateTokenDetails(d: {
  name: string;
  symbol: string;
  decimals: number;
  supply: string;
}): Record<string, string> {
  const e: Record<string, string> = {};
  const nameLen = byteLen(d.name);
  if (nameLen < 1 || nameLen > NAME_MAX_BYTES) e.name = `Name must be 1-${NAME_MAX_BYTES} bytes.`;
  const symLen = byteLen(d.symbol);
  if (symLen < 1 || symLen > SYMBOL_MAX_BYTES)
    e.symbol = `Symbol must be 1-${SYMBOL_MAX_BYTES} bytes.`;
        if (!Number.isInteger(d.decimals) || d.decimals < DECIMALS_MIN || d.decimals > DECIMALS_MAX)
    e.decimals = `Decimals must be between ${DECIMALS_MIN} and ${DECIMALS_MAX}.`;
  let supply: bigint | null = null;
  try {
    supply = /^\d+$/.test(d.supply) ? BigInt(d.supply) : null;
  } catch {
    supply = null;
  }
  if (supply === null || supply < SUPPLY_MIN || supply > SUPPLY_MAX)
    e.supply = `Supply must be between ${SUPPLY_MIN.toLocaleString("en-US")} and ${SUPPLY_MAX.toLocaleString("en-US")} whole tokens.`;
  return e;
}

const SOCIAL_HOSTS: Record<string, { hosts: string[]; label: string }> = {
  twitter: { hosts: ["x.com", "twitter.com"], label: "an x.com or twitter.com" },
  telegram: { hosts: ["t.me", "telegram.me", "telegram.org"], label: "a t.me" },
};

function hostMatches(host: string, allowed: string[]): boolean {
  return allowed.some((a) => host === a || host.endsWith(`.${a}`));
}

export function validateSocials(d: {
  website: string;
  twitter: string;
  telegram: string;
}): Record<string, string> {
  const e: Record<string, string> = {};

  for (const key of ["website", "twitter", "telegram"] as const) {
    const raw = d[key].trim();
    if (raw === "") continue;

    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      e[key] = raw.startsWith("@")
        ? "Enter the full link, not a handle."
        : "Enter a full link starting with https://";
      continue;
    }

        if (url.protocol !== "https:" && url.protocol !== "http:") {
      e[key] = "Only http and https links are allowed.";
      continue;
    }

    const expected = SOCIAL_HOSTS[key];
    if (expected && !hostMatches(url.hostname.toLowerCase(), expected.hosts)) {
      e[key] = `Enter ${expected.label} link.`;
    }
  }

  return e;
}

export function validateLock(
  d: { unlockTime: number },
  nowSeconds: number,
): Record<string, string> {
  const e: Record<string, string> = {};
                          if (d.unlockTime < nowSeconds + MIN_LOCK_DURATION_SECONDS)
    e.unlockTime = "Lock duration must be at least 30 days.";
  return e;
}
