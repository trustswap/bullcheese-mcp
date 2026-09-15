const URL_PATTERN = /([a-z][a-z0-9+.-]*:\/\/)(?:[^\s/@?#'"`]+@)?([^\s/?#'"`]+)([^\s'"`]*)/gi;

export function redactUrls(text: string): string {
  return text.replace(URL_PATTERN, (_match, scheme: string, host: string, rest: string) =>
    rest ? `${scheme}${host}/…` : `${scheme}${host}`,
  );
}

export function redactDeep(value: unknown): unknown {
  if (typeof value === "string") return redactUrls(value);
  if (Array.isArray(value)) return value.map(redactDeep);
  if (value instanceof Error) return redactUrls(value.message);
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = redactDeep(v);
    return out;
  }
  return value;
}
