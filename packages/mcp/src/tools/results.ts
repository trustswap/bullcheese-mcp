import type { CallToolResult } from "@modelcontextprotocol/server";
import { SignerError } from "@trustswap/bullcheese-signer";
import { redactDeep, redactUrls } from "../errors.js";
import { QuoteError } from "../quotes.js";
import { ToolError } from "../services/execute.js";

const json = (v: unknown) =>
  JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? x.toString() : x), 2);

export function jsonSafe(v: unknown): unknown {
  if (typeof v === "bigint") return v.toString();
  if (Array.isArray(v)) return v.map(jsonSafe);
  if (v !== null && typeof v === "object") {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, jsonSafe(x)]));
  }
  return v;
}

export function ok(data: Record<string, unknown>): CallToolResult {
  const safe = jsonSafe(data) as Record<string, unknown>;
  return { content: [{ type: "text", text: json(safe) }], structuredContent: safe };
}

export function fail(err: unknown): CallToolResult {
  let body: { code: string; message: string; details?: unknown };
  if (err instanceof ToolError)
    body = { code: err.code, message: err.message, details: err.details };
  else if (err instanceof QuoteError) body = { code: `quote_${err.reason}`, message: err.message };
  else if (err instanceof SignerError)
            body = {
      code: err.code === "chain_not_permitted" ? "chain_not_permitted" : "signing_failed",
      message: err.message,
    };
  else body = { code: "internal", message: err instanceof Error ? err.message : String(err) };
      const redacted = {
    ...body,
    message: redactUrls(body.message),
    ...(body.details === undefined ? {} : { details: jsonSafe(redactDeep(body.details)) }),
  };
  return {
    content: [{ type: "text", text: json(redacted) }],
    structuredContent: redacted,
    isError: true,
  };
}

export async function guard(fn: () => Promise<Record<string, unknown>>): Promise<CallToolResult> {
  try {
    return ok(await fn());
  } catch (e) {
    return fail(e);
  }
}
