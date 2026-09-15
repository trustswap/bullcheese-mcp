#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { loadConfig } from "../config.js";
import { createDeps } from "../deps.js";
import { createServer } from "../server.js";

async function main() {
  const config = loadConfig(process.env);
  const deps = await createDeps(config);
  const server = createServer(deps);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `bullcheese-mcp stdio ready: chains ${[...deps.chains.keys()].join(",")} persona ${deps.identity.personaId}`,
  );
}

main().catch((e) => {
  console.error(`bullcheese-mcp failed to start: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
