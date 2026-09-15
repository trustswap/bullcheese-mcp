import { encodeFunctionData, type Address, type Hex } from "viem";
import { ERC20ABI } from "../contracts/abi/ERC20.js";
import { SwapRouter02ExactInputSingleABI } from "../contracts/abi/SwapRouter02.js";
import { MINTPLUS_FEE_TIER, type MintPlusContractConfig } from "../contracts/mintplus.js";

export interface BuiltCall {
  to: Address;
  data: Hex;
  value: bigint;
}

export function buildExactInputSingle(p: {
  cfg: MintPlusContractConfig;
  tokenIn: Address;
  tokenOut: Address;
  recipient: Address;
  amountIn: bigint;
  amountOutMinimum: bigint;
  payNative: boolean;
}): BuiltCall {
  const data = encodeFunctionData({
    abi: SwapRouter02ExactInputSingleABI,
    functionName: "exactInputSingle",
    args: [
      {
        tokenIn: p.tokenIn,
        tokenOut: p.tokenOut,
        fee: MINTPLUS_FEE_TIER,
        recipient: p.recipient,
        amountIn: p.amountIn,
        amountOutMinimum: p.amountOutMinimum,
        sqrtPriceLimitX96: 0n,
      },
    ],
  });
  return { to: p.cfg.swapRouter, data, value: p.payNative ? p.amountIn : 0n };
}

export function buildApprove(p: { token: Address; spender: Address; amount: bigint }): BuiltCall {
  const data = encodeFunctionData({
    abi: ERC20ABI,
    functionName: "approve",
    args: [p.spender, p.amount],
  });
  return { to: p.token, data, value: 0n };
}

export function minOutFor(expectedOut: bigint, slippageBps: number): bigint {
  return (expectedOut * BigInt(10_000 - slippageBps)) / 10_000n;
}
