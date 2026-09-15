import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import { CHAINS } from "@trustswap/bullcheese-core";
import type { Hex } from "viem";

export interface Config {
  localPrivateKey: Hex;
  rpcUrls: Record<number, string>;
    tfApiQueryUrl?: string;
  auditDb: string;
    /** Unset means no cap. */
    txCap?: string;
    dailyCap?: string;
  runId: string;
  personaId: string;
  httpPort: number;
  agentTokens: Record<string, string>;
    pinataJwt?: string;
    pinataUrl?: string;
    pinDailyLimit: number;
}

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const rawKey = env.BULLCHEESE_LOCAL_PRIVATE_KEY;
  if (!rawKey || !/^0x[0-9a-fA-F]{64}$/.test(rawKey)) {
    throw new Error("BULLCHEESE_LOCAL_PRIVATE_KEY must be a 0x-prefixed 32-byte hex key");
  }
  const localPrivateKey = rawKey as Hex;

  const rpcUrls: Record<number, string> = {};
  for (const chain of Object.values(CHAINS)) {
    const fromEnv = env[`BULLCHEESE_RPC_${chain.id}`];
    const fallback = chain.rpcUrls.default.http[0];
    const url = fromEnv ?? fallback;
    if (url) rpcUrls[chain.id] = url;
  }

  let agentTokens: Record<string, string> = {};
  if (env.BULLCHEESE_AGENT_TOKENS) {
    const parsed: unknown = JSON.parse(env.BULLCHEESE_AGENT_TOKENS);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("BULLCHEESE_AGENT_TOKENS must be a JSON object of token -> persona label");
    }
    agentTokens = parsed as Record<string, string>;
                        for (const [token, persona] of Object.entries(agentTokens)) {
      if (typeof persona !== "string" || persona === "") {
        throw new Error(`BULLCHEESE_AGENT_TOKENS: token ${token.slice(0, 4)}… has an empty persona`);
      }
    }
  }

      const httpPort = Number(env.BULLCHEESE_HTTP_PORT ?? 8080);
  if (!Number.isInteger(httpPort) || httpPort < 1 || httpPort > 65535) {
    throw new Error(
      `BULLCHEESE_HTTP_PORT must be an integer between 1 and 65535, got ${JSON.stringify(env.BULLCHEESE_HTTP_PORT)}`,
    );
  }

            const pinDailyLimit = env.BULLCHEESE_PIN_DAILY_LIMIT ? Number(env.BULLCHEESE_PIN_DAILY_LIMIT) : 20;
  if (!Number.isInteger(pinDailyLimit) || pinDailyLimit < 1) {
    throw new Error(
      `BULLCHEESE_PIN_DAILY_LIMIT must be a positive integer, got ${JSON.stringify(env.BULLCHEESE_PIN_DAILY_LIMIT)}`,
    );
  }

  const config: Config = {
    localPrivateKey,
    rpcUrls,
    ...(env.BULLCHEESE_POLICY_TX_CAP ? { txCap: env.BULLCHEESE_POLICY_TX_CAP } : {}),
    ...(env.BULLCHEESE_POLICY_DAILY_CAP ? { dailyCap: env.BULLCHEESE_POLICY_DAILY_CAP } : {}),
    auditDb: env.BULLCHEESE_AUDIT_DB ?? join(homedir(), ".bullcheese-mcp", "audit.db"),
    runId: env.BULLCHEESE_RUN_ID ?? randomUUID(),
    personaId: env.BULLCHEESE_PERSONA_ID ?? "default",
    httpPort,
    agentTokens,
    pinDailyLimit,
  };
          if (env.BULLCHEESE_TF_API_QUERY_URL === undefined) {
    config.tfApiQueryUrl = "https://api.team.finance";
  } else if (env.BULLCHEESE_TF_API_QUERY_URL !== "") {
    config.tfApiQueryUrl = env.BULLCHEESE_TF_API_QUERY_URL.replace(/\/$/, "");
  }
  if (env.BULLCHEESE_PINATA_JWT) config.pinataJwt = env.BULLCHEESE_PINATA_JWT;
  if (env.BULLCHEESE_PINATA_URL) config.pinataUrl = env.BULLCHEESE_PINATA_URL;
  return config;
}
