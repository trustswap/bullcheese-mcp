import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/server";
import type { Deps } from "./deps.js";
import { registerTools } from "./tools/register.js";

// This module runs from src/, dist/ or the bundle/ entry points, each one level
// below package.json, so the published version is always "../package.json".
const { version } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { version: string };

export const SERVER_INFO = { name: "bullcheese-mcp", version } as const;

export function createServer(deps: Deps): McpServer {
  const server = new McpServer(SERVER_INFO, {
    instructions:
      "Quote first, then execute with the quoteId within 60 seconds. Never ask a human for a private key. Report chain, wallet and cost before launching.",
  });
  registerTools(server, deps);
  return server;
}
