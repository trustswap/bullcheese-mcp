import {
  ERC20ABI,
  MintPlusABI,
  MintPlusLockerABI,
  minOutFor,
  SwapRouter02ExactInputSingleABI,
} from "@trustswap/bullcheese-core";
import { decodeFunctionData, isAddressEqual, type Address } from "viem";
import type { PolicyCheck, PolicyContext, PolicyDecision, SignRequest } from "./types.js";

const deny = (check: PolicyCheck, reason: string): PolicyDecision => ({
  allowed: false,
  check,
  reason,
});

function lower(a: Address): Address {
  return a.toLowerCase() as Address;
}

export function evaluatePolicy(req: SignRequest, ctx: PolicyContext): PolicyDecision {
    if (!ctx.profile.chainIds.has(req.chainId)) {
    return deny("chain", `chain ${req.chainId} is not permitted for this wallet`);
  }
  if (!isAddressEqual(req.from, ctx.wallet)) {
    return deny("chain", "request is not from the policy wallet");
  }

    if (req.quote.expiresAt <= ctx.nowSeconds) {
    return deny("quote", `quote ${req.quote.id} expired`);
  }

    const isMintPlus = isAddressEqual(req.to, ctx.cfg.mintPlus);
  const isRouter = isAddressEqual(req.to, ctx.cfg.swapRouter);
  const isPair = isAddressEqual(req.to, ctx.cfg.pairToken.address);
  const isKnownToken = ctx.knownTokens.has(lower(req.to));
  const isKnownLocker = ctx.knownLockers.has(lower(req.to));
  if (!isMintPlus && !isRouter && !isPair && !isKnownToken && !isKnownLocker) {
    return deny("destination", `${req.to} is not an allowed destination`);
  }

    if (isMintPlus) {
    if (req.purpose !== "launch") return deny("selector", "MintPlus accepts launches only");
    let decoded;
    try {
      decoded = decodeFunctionData({ abi: MintPlusABI, data: req.data });
    } catch {
      return deny("selector", "calldata is not a MintPlus function");
    }
    if (decoded.functionName !== "deploy") {
      return deny("selector", `${decoded.functionName} is not allowed on MintPlus`);
    }
    const config = decoded.args[0];
    if (!isAddressEqual(config.lockParams.withdrawalAddress, ctx.wallet)) {
      return deny("arguments", "withdrawalAddress must be the wallet");
    }
    if (req.value !== 0n) return deny("arguments", "one-sided launches carry no value");
    return { allowed: true, spend: 0n };
  }

  if (isRouter) {
    if (req.purpose !== "swap") return deny("selector", "router accepts swaps only");
    let decoded;
    try {
      decoded = decodeFunctionData({ abi: SwapRouter02ExactInputSingleABI, data: req.data });
    } catch {
      return deny("selector", "calldata is not exactInputSingle");
    }
    if (decoded.functionName !== "exactInputSingle") {
      return deny("selector", `${decoded.functionName} is not allowed on the router`);
    }
    const p = decoded.args[0];
    if (!isAddressEqual(p.recipient, ctx.wallet)) {
      return deny("arguments", "swap recipient must be the wallet");
    }
    const { expectedOut, slippageBps, amountIn } = req.quote;
    if (expectedOut === undefined || slippageBps === undefined || amountIn === undefined) {
      return deny("quote", "swap quote is missing expectedOut, slippageBps or amountIn");
    }
    if (slippageBps < ctx.profile.slippageMinBps || slippageBps > ctx.profile.slippageMaxBps) {
      return deny(
        "arguments",
        `slippage ${slippageBps} bps outside [${ctx.profile.slippageMinBps}, ${ctx.profile.slippageMaxBps}]`,
      );
    }
    if (p.amountIn !== amountIn) return deny("arguments", "amountIn differs from the quote");
    if (p.amountOutMinimum !== minOutFor(expectedOut, slippageBps)) {
      return deny("arguments", "amountOutMinimum does not match the quote and slippage");
    }
                            const inIsPair = isAddressEqual(p.tokenIn, ctx.cfg.pairToken.address);
    const outIsPair = isAddressEqual(p.tokenOut, ctx.cfg.pairToken.address);
    if (!inIsPair && !outIsPair) {
      return deny("arguments", "exactly one side must be the pair token");
    }
    if (req.value !== 0n && (!inIsPair || req.value !== p.amountIn)) {
      return deny("arguments", "native value must equal amountIn of the pair token");
    }
    const spend = inIsPair ? p.amountIn : 0n;
    return capCheck(spend, ctx);
  }

  if (isKnownLocker) {
    if (req.purpose !== "collect") return deny("selector", "lockers accept fee collection only");
    let decoded;
    try {
      decoded = decodeFunctionData({ abi: MintPlusLockerABI, data: req.data });
    } catch {
      return deny("selector", "calldata is not a locker function");
    }
    if (decoded.functionName !== "collectFees") {
      return deny("selector", `${decoded.functionName} is not allowed on lockers`);
    }
    if (req.value !== 0n) return deny("arguments", "fee collection carries no value");
    return { allowed: true, spend: 0n };
  }

    if (req.purpose !== "approve") return deny("selector", "token contracts accept approvals only");
  let decoded;
  try {
    decoded = decodeFunctionData({ abi: ERC20ABI, data: req.data });
  } catch {
    return deny("selector", "calldata is not an ERC-20 function");
  }
  if (decoded.functionName !== "approve") {
    return deny("selector", `${decoded.functionName} is not allowed on tokens`);
  }
  const [spender, amount] = decoded.args as readonly [Address, bigint];
  if (!isAddressEqual(spender, ctx.cfg.swapRouter)) {
    return deny("arguments", "approvals may only name the router");
  }
  if (req.quote.amountIn === undefined || amount !== req.quote.amountIn) {
    return deny("arguments", "approval amount must equal the quoted amountIn");
  }
  if (req.value !== 0n) return deny("arguments", "approvals carry no value");
  return { allowed: true, spend: 0n };
}

function capCheck(spend: bigint, ctx: PolicyContext): PolicyDecision {
    if (ctx.profile.txCap !== null && spend > ctx.profile.txCap) {
    return deny("value_cap", `spend ${spend} exceeds per-transaction cap ${ctx.profile.txCap}`);
  }
  if (ctx.profile.dailyCap !== null && ctx.spent24h + spend > ctx.profile.dailyCap) {
    return deny(
      "daily_cap",
      `spend ${spend} plus ${ctx.spent24h} in the last 24h exceeds ${ctx.profile.dailyCap}`,
    );
  }
  return { allowed: true, spend };
}
