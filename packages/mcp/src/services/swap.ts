import {
  buildApprove,
  buildExactInputSingle,
  ERC20ABI,
  minOutFor,
  parseAmount,
  quoteExactInputSingle,
  quoteExactInputSingleWithApproval,
  readAllowance,
  SIMULATE_CALLS_UNSUPPORTED_MESSAGE,
} from "@trustswap/bullcheese-core";
import { isAddressEqual, type Address, type Hex } from "viem";
import type { Deps } from "../deps.js";
import type { SwapQuote } from "../quotes.js";
import {
  auditRefusals,
  chainOrThrow,
  executeTx,
  ToolError,
  type RefusalContext,
} from "./execute.js";

export interface SwapQuoteView {
  quoteId: string;
  expiresAt: number;
  chainId: number;
  tokenIn: Address;
  tokenOut: Address;
  amountIn: string;
  expectedOut: string;
  priceImpactBps: number | null;
  needsApproval: boolean;
  payNative: boolean;
}

export async function quoteSwap(
  deps: Deps,
  input: { chainId: number; tokenIn: Address; tokenOut: Address; amountIn: string },
): Promise<SwapQuoteView> {
  const chain = chainOrThrow(deps, input.chainId);
  const pair = chain.cfg.pairToken;
  const inIsPair = isAddressEqual(input.tokenIn, pair.address);
  const outIsPair = isAddressEqual(input.tokenOut, pair.address);
  if (inIsPair === outIsPair) {
    throw new ToolError("invalid_input", `exactly one side must be the pair token ${pair.symbol}`);
  }
  const wallet = await deps.signer.address(input.chainId);
        const inDecimals = inIsPair
    ? pair.decimals
    : Number(
        await chain.client.readContract({
          address: input.tokenIn,
          abi: ERC20ABI,
          functionName: "decimals",
        }),
      );
  const amountIn = parseAmount(input.amountIn, inDecimals);
  if (amountIn === null || amountIn <= 0n) {
    throw new ToolError("invalid_input", "amountIn must be a positive decimal amount");
  }
  const payNative = inIsPair && pair.kind === "wrapped-native";

                  let needsApproval = false;
  if (!payNative) {
    const allowance = await readAllowance(
      chain.client,
      input.tokenIn,
      wallet,
      chain.cfg.swapRouter,
    );
    needsApproval = allowance < amountIn;
  }

  const simulate = (amount: bigint) =>
    needsApproval
      ? quoteExactInputSingleWithApproval(chain.client, {
          cfg: chain.cfg,
          tokenIn: input.tokenIn,
          tokenOut: input.tokenOut,
          from: wallet,
          amountIn: amount,
        })
      : quoteExactInputSingle(chain.client, {
          cfg: chain.cfg,
          tokenIn: input.tokenIn,
          tokenOut: input.tokenOut,
          from: wallet,
          amountIn: amount,
          payNative,
        });
  let expectedOut: bigint;
  try {
    expectedOut = await simulate(amountIn);
  } catch (e) {
                    const message = e instanceof Error ? e.message : String(e);
    if (
      message === SIMULATE_CALLS_UNSUPPORTED_MESSAGE ||
      message.startsWith("approve simulation reverted")
    ) {
      throw new ToolError("quote_failed", message);
    }
    throw new ToolError("quote_failed", `swap simulation reverted: ${String(e)}`);
  }
  let priceImpactBps: number | null = null;
  const probe = amountIn / 1000n;
  if (probe > 0n) {
    try {
      const small = await simulate(probe);
      const ideal = small * 1000n;
      if (ideal > 0n) {
        const bps = Number(((ideal - expectedOut) * 10_000n) / ideal);
        priceImpactBps = Math.min(10_000, Math.max(0, bps));
      }
    } catch {
      priceImpactBps = null;
    }
  }

  const quote = deps.quotes.put({
    kind: "swap",
    chainId: input.chainId,
    wallet,
    tokenIn: input.tokenIn,
    tokenOut: input.tokenOut,
    amountIn,
    expectedOut,
    payNative,
    needsApproval,
  });
  return {
    quoteId: quote.id,
    expiresAt: quote.expiresAt,
    chainId: input.chainId,
    tokenIn: input.tokenIn,
    tokenOut: input.tokenOut,
    amountIn: amountIn.toString(),
    expectedOut: expectedOut.toString(),
    priceImpactBps,
    needsApproval,
    payNative,
  };
}

export async function swap(
  deps: Deps,
  input: { quoteId: string; slippageBps?: number },
): Promise<{ txHash: Hex; approvalTxHash?: Hex; amountOutMinimum: string; expectedOut: string }> {
  const ctx: RefusalContext = { tool: "swap", inputs: { quoteId: input.quoteId } };
  return auditRefusals(deps, ctx, () => sendSwap(deps, input, ctx));
}

async function sendSwap(
  deps: Deps,
  input: { quoteId: string; slippageBps?: number },
  ctx: RefusalContext,
): Promise<{ txHash: Hex; approvalTxHash?: Hex; amountOutMinimum: string; expectedOut: string }> {
  const slippageBps = input.slippageBps ?? 100;
  const quote = deps.quotes.take(input.quoteId);
      ctx.chainId = quote.chainId;
  if (quote.kind !== "swap")
    throw new ToolError("invalid_input", `${input.quoteId} is not a swap quote`);
  const chain = chainOrThrow(deps, quote.chainId);
  const profile = deps.profileFor(quote.chainId);
  if (slippageBps < profile.slippageMinBps || slippageBps > profile.slippageMaxBps) {
    throw new ToolError(
      "invalid_input",
      `slippageBps must be within [${profile.slippageMinBps}, ${profile.slippageMaxBps}]`,
    );
  }
  const nonPairToken = isAddressEqual(quote.tokenIn, chain.cfg.pairToken.address)
    ? quote.tokenOut
    : quote.tokenIn;
  const amountOutMinimum = minOutFor(quote.expectedOut, slippageBps);

        const auditInputs = {
    ...input,
    tokenIn: quote.tokenIn,
    tokenOut: quote.tokenOut,
    amountIn: quote.amountIn.toString(),
    amountOutMinimum: amountOutMinimum.toString(),
  };

  let approvalTxHash: Hex | undefined;
  if (quote.needsApproval) {
    const approve = buildApprove({
      token: quote.tokenIn,
      spender: chain.cfg.swapRouter,
      amount: quote.amountIn,
    });
    const res = await executeTx(deps, {
      chainId: quote.chainId,
      call: approve,
      purpose: "approve",
      quote: { id: quote.id, expiresAt: quote.expiresAt, amountIn: quote.amountIn },
      tool: "swap.approve",
      inputs: auditInputs,
      extraKnownTokens: [nonPairToken],
    });
    approvalTxHash = res.txHash;
  }

  const call = buildExactInputSingle({
    cfg: chain.cfg,
    tokenIn: quote.tokenIn,
    tokenOut: quote.tokenOut,
    recipient: quote.wallet,
    amountIn: quote.amountIn,
    amountOutMinimum,
    payNative: quote.payNative,
  });
  const res = await executeTx(deps, {
    chainId: quote.chainId,
    call,
    purpose: "swap",
    quote: {
      id: quote.id,
      expiresAt: quote.expiresAt,
      expectedOut: quote.expectedOut,
      slippageBps,
      amountIn: quote.amountIn,
    },
    tool: "swap",
    inputs: auditInputs,
    extraKnownTokens: [nonPairToken],
  });
  return {
    txHash: res.txHash,
    ...(approvalTxHash ? { approvalTxHash } : {}),
    amountOutMinimum: amountOutMinimum.toString(),
    expectedOut: quote.expectedOut.toString(),
  };
}

export type { SwapQuote };
