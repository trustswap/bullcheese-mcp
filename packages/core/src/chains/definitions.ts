import { defineChain } from "viem";

/**
 * ARC mainnet. Gas is paid in native USDC, which the chain also exposes as a
 * 6-decimal ERC-20 at 0x3600…0000; MintPlus there pairs against that view.
 */
export const arc = defineChain({
  id: 5042, // 0x13b2
  name: "ARC",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://arc.drpc.org"] } },
});
