import {
  createChainClient,
  detectAnvil,
  getMintPlusConfig,
  getChain,
  parseAmount,
  type MintPlusContractConfig,
} from "@trustswap/bullcheese-core";
import {
  openAuditStore,
  type AuditStore,
  type PolicyProfile,
} from "@trustswap/bullcheese-policy";
import { LocalKeySigner, type Signer } from "@trustswap/bullcheese-signer";
import type { Chain, PublicClient } from "viem";
import type { Config } from "./config.js";
import type { IpfsPinClient } from "./ipfs/types.js";
import { PinataClient } from "./ipfs/pinata.js";
import { pairUsdFor } from "./prices.js";
import { QuoteStore } from "./quotes.js";
import { TfApiQuery } from "./tfApi/query.js";

export interface ChainDeps {
  chainId: number;
  chain: Chain;
  cfg: MintPlusContractConfig;
  client: PublicClient;
  isAnvil: boolean;
}

export interface Deps {
  chains: Map<number, ChainDeps>;
  signer: Signer;
  audit: AuditStore;
  quotes: QuoteStore;
  profileFor(chainId: number): PolicyProfile;
  identity: { runId: string; personaId: string };
  now(): number;
  locks: Map<string, Promise<unknown>>;
    pairUsd(chainId: number): Promise<number>;
    tfApiQuery?: TfApiQuery;
    ipfs?: IpfsPinClient;
    pinsToday: { day: string; count: number };
    pinDailyLimit: number;
}

async function buildChains(config: Config): Promise<Map<number, ChainDeps>> {
  const chains = new Map<number, ChainDeps>();
  for (const [idStr, rpcUrl] of Object.entries(config.rpcUrls)) {
    const chainId = Number(idStr);
    const chain = getChain(chainId);
    const cfg = getMintPlusConfig(chainId);
    if (!chain || !cfg) continue;
    const client = createChainClient(chainId, rpcUrl);
    let isAnvil = false;
    try {
      isAnvil = await detectAnvil(client);
    } catch {
          }
    chains.set(chainId, { chainId, chain, cfg, client, isAnvil });
  }
  return chains;
}

export async function createDeps(config: Config): Promise<Deps> {
  const chains = await buildChains(config);
  if (chains.size === 0) {
    throw new Error("no chains configured: set BULLCHEESE_RPC_<chainId> for at least one chain");
  }
  const permitted = new Set(chains.keys());
  // An unset cap is unlimited; a set one that does not parse refuses all spend.
  const parseCap = (cap: string | undefined, decimals: number) =>
    cap === undefined ? null : (parseAmount(cap, decimals) ?? 0n);
  const signer = new LocalKeySigner({
    privateKey: config.localPrivateKey,
    permittedChainIds: permitted,
  });
  const audit = openAuditStore(config.auditDb);

  const ipfs = config.pinataJwt
    ? new PinataClient({
        jwt: config.pinataJwt,
        ...(config.pinataUrl ? { baseUrl: config.pinataUrl } : {}),
      })
    : undefined;

  const tfApiQuery = config.tfApiQueryUrl
    ? new TfApiQuery({ baseUrl: config.tfApiQueryUrl })
    : undefined;

  const now = () => Math.floor(Date.now() / 1000);
  const deps: Deps = {
    chains,
    signer,
    audit,
    quotes: new QuoteStore(now),
    profileFor(chainId) {
      const cfg = chains.get(chainId)?.cfg;
      const decimals = cfg?.pairToken.decimals ?? 18;
      return {
        chainIds: permitted,
        txCap: parseCap(config.txCap, decimals),
        dailyCap: parseCap(config.dailyCap, decimals),
        slippageMinBps: 10,
        slippageMaxBps: 500,
      };
    },
    identity: { runId: config.runId, personaId: config.personaId },
    now,
    locks: new Map(),
            pairUsd: () => Promise.reject(new Error("pairUsd was not initialised")),
    tfApiQuery,
    ipfs,
    pinsToday: { day: "", count: 0 },
    pinDailyLimit: config.pinDailyLimit,
  };
  deps.pairUsd = pairUsdFor(deps);
  return deps;
}
