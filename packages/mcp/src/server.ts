import { McpServer } from "@modelcontextprotocol/server";
import type { Deps } from "./deps.js";
import { registerTools } from "./tools/register.js";

export const SERVER_INFO = { name: "bullcheese-mcp", version: "0.1.0" } as const;

export function createServer(deps: Deps): McpServer {
  const server = new McpServer(SERVER_INFO, {
    instructions:
      "Quote first, then execute with the quoteId within 60 seconds. Never ask a human for a private key. Report chain, wallet and cost before launching.",
  });
  registerTools(server, deps);
  return server;
}
