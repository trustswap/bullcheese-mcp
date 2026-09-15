import { readBalance, readErc20 } from "@trustswap/bullcheese-core";
import { formatUnits, type Address } from "viem";
import type { Deps } from "../deps.js";
import { chainOrThrow } from "./execute.js";

function fmt(raw: bigint, decimals: number): string {
  return formatUnits(raw, decimals)
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
}

export async function getWallet(deps: Deps, chainId: number) {
  const chain = chainOrThrow(deps, chainId);
  const address = await deps.signer.address(chainId);
  const pair = chain.cfg.pairToken;
  const [native, pairBalance] = await Promise.all([
    chain.client.getBalance({ address }),
    readBalance(chain.client, pair.address, address),
  ]);
  const profile = deps.profileFor(chainId);
  const spent24h = await deps.audit.sumSpendSince(address, chainId, deps.now() - 86_400);
  const cap = (raw: bigint | null) => (raw === null ? "unlimited" : fmt(raw, pair.decimals));
  const remaining =
    profile.dailyCap === null ? null : profile.dailyCap > spent24h ? profile.dailyCap - spent24h : 0n;
  return {
    address,
    native: fmt(native, chain.chain.nativeCurrency.decimals),
    pairToken: { symbol: pair.symbol, balance: fmt(pairBalance, pair.decimals) },
    policy: {
      txCap: cap(profile.txCap),
      dailyCap: cap(profile.dailyCap),
      spent24h: fmt(spent24h, pair.decimals),
      remainingToday: cap(remaining),
    },
    isAnvil: chain.isAnvil,
  };
}

export async function getBalances(deps: Deps, chainId: number, tokens?: Address[]) {
  const chain = chainOrThrow(deps, chainId);
  const address = await deps.signer.address(chainId);
  const list = tokens?.length ? tokens : await deps.audit.launchedTokens(address, chainId);
  return Promise.all(
    list.map(async (token) => {
      const [{ symbol, decimals }, balance] = await Promise.all([
        readErc20(chain.client, token),
        readBalance(chain.client, token, address),
      ]);
      return {
        token,
        symbol,
        decimals,
        balance: fmt(balance, decimals),
      };
    }),
  );
}
