import { createRequire } from "node:module";
import type { Address } from "viem";
import { parseUnits } from "viem";
import JSBI from "jsbi";
import { MAX_USABLE_TICK, MIN_USABLE_TICK, TICK_SPACING } from "../contracts/constants.js";

const cjsRequire = createRequire(import.meta.url);
const { encodeSqrtRatioX96, TickMath } = cjsRequire(
  "@uniswap/v3-sdk",
) as typeof import("@uniswap/v3-sdk");

export interface PoolPairToken {
  address: Address;
  decimals: number;
}

export interface OneSidedPoolInput {
    initialSupplyRaw: bigint;
  marketCapUsd: string;
    pairUsd: number;
  predictedToken: Address;
  pairToken: PoolPairToken;
}

export interface OneSidedPoolParams {
  sqrtPriceX96: bigint;
  tickLower: number;
  tickUpper: number;
  tokenIsToken0: boolean;
}

const floorToSpacing = (t: number) => Math.floor(t / TICK_SPACING) * TICK_SPACING;
const ceilToSpacing = (t: number) => Math.ceil(t / TICK_SPACING) * TICK_SPACING;

export function computeOneSidedPoolParams(input: OneSidedPoolInput): OneSidedPoolParams {
  const tokenIsToken0 = input.predictedToken.toLowerCase() < input.pairToken.address.toLowerCase();

          const marketCapPairRaw = parseUnits(
    (Number(input.marketCapUsd) / input.pairUsd).toFixed(input.pairToken.decimals),
    input.pairToken.decimals,
  );

  const tokenSide = JSBI.BigInt(input.initialSupplyRaw.toString());
  const pairSide = JSBI.BigInt(marketCapPairRaw.toString());
  const amount0 = tokenIsToken0 ? tokenSide : pairSide;
  const amount1 = tokenIsToken0 ? pairSide : tokenSide;

  const sqrt = encodeSqrtRatioX96(amount1, amount0);
  const currentTick = TickMath.getTickAtSqrtRatio(sqrt);

  let tickLower: number;
  let tickUpper: number;
  if (tokenIsToken0) {
    tickLower = ceilToSpacing(currentTick);
    if (JSBI.greaterThan(sqrt, TickMath.getSqrtRatioAtTick(tickLower))) {
      tickLower += TICK_SPACING;
    }
    tickUpper = MAX_USABLE_TICK;
  } else {
    tickUpper = floorToSpacing(currentTick);
    if (JSBI.lessThan(sqrt, TickMath.getSqrtRatioAtTick(tickUpper))) {
      tickUpper -= TICK_SPACING;
    }
    tickLower = MIN_USABLE_TICK;
  }

  if (
    tickLower < MIN_USABLE_TICK ||
    tickUpper > MAX_USABLE_TICK ||
    tickLower >= tickUpper ||
    Math.abs(tickLower % TICK_SPACING) !== 0 ||
    Math.abs(tickUpper % TICK_SPACING) !== 0
  ) {
    throw new Error("mintplus: computed an invalid one-sided tick range");
  }

  return {
    sqrtPriceX96: BigInt(sqrt.toString()),
    tickLower,
    tickUpper,
    tokenIsToken0,
  };
}
