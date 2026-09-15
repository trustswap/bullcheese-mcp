#!/usr/bin/env node
import { createServer as createHttpServer } from "node:http";
import { loadConfig } from "../config.js";
import { createDeps } from "../deps.js";
import { redactUrls } from "../errors.js";
import { createHttpHandler } from "../http/handler.js";

async function main() {
  const config = loadConfig(process.env);
  if (Object.keys(config.agentTokens).length === 0) {
    throw new Error("BULLCHEESE_AGENT_TOKENS is required");
  }
                      const base = await createDeps(config);
  const byToken = new Map(
    Object.entries(config.agentTokens).map(([token, persona]) => [
      token,
      { ...base, identity: { ...base.identity, personaId: persona } },
    ]),
  );

  const handler = createHttpHandler((token) => Promise.resolve(byToken.get(token)));
  const server = createHttpServer((req, res) => {
    handler(req, res).catch((e) => {
                        console.error(redactUrls(`request failed: ${e instanceof Error ? e.message : String(e)}`));
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
  });
  server.on("error", (e: Error) => {
    console.error(redactUrls(`bullcheese-mcp http server error: ${e.message}`));
    process.exit(1);
  });
  server.listen(config.httpPort, "0.0.0.0", () => {
    console.error(`bullcheese-mcp http listening on :${config.httpPort}/mcp`);
  });
}

main().catch((e) => {
  console.error(
    redactUrls(`bullcheese-mcp failed to start: ${e instanceof Error ? e.message : String(e)}`),
  );
  process.exit(1);
});
