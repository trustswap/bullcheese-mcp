import type { Chain } from "viem";
import { arc } from "./definitions.js";

export const CHAINS: Record<number, Chain> = {
  [arc.id]: arc,
};

export function getChain(chainId: number): Chain | undefined {
  return CHAINS[chainId];
}
