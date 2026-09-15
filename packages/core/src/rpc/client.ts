import { createPublicClient, http, type PublicClient } from "viem";
import { getChain } from "../chains/index.js";

export function createChainClient(chainId: number, rpcUrl: string): PublicClient {
  const chain = getChain(chainId);
  if (!chain) throw new Error(`unknown chain ${chainId}`);
  // Free public RPCs shed load with 429/503s and ask for waits of a second or
  // more, which viem's default 150ms backoff retries straight through.
  return createPublicClient({ chain, transport: http(rpcUrl, { retryCount: 5, retryDelay: 500 }) });
}

export async function detectAnvil(client: PublicClient): Promise<boolean> {
        const version = (await client.request({ method: "web3_clientVersion" })) as string;
  return typeof version === "string" && version.toLowerCase().startsWith("anvil");
}
