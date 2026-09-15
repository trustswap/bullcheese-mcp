import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Deps } from "../deps.js";
import { createServer } from "../server.js";

export function createHttpHandler(
  resolve: (token: string) => Promise<Deps | undefined>,
): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  return async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname !== "/mcp") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "not_found" }));
      return;
    }
    const auth = req.headers.authorization ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const deps = token === "" ? undefined : await resolve(token);
    if (!deps) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "unauthorized" }));
      return;
    }
    const server = createServer(deps);
    const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      transport.close().catch((e: unknown) => {
        console.error(`failed to close transport: ${e instanceof Error ? e.message : String(e)}`);
      });
      server.close().catch((e: unknown) => {
        console.error(`failed to close server: ${e instanceof Error ? e.message : String(e)}`);
      });
    });
    await server.connect(transport);
    await transport.handleRequest(req, res);
  };
}
