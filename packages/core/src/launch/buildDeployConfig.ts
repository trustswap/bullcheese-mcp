import { parseUnits, type Address } from "viem";

import { computeOneSidedPoolParams, type PoolPairToken } from "./pool.js";

export interface DeployConfigInput {
  name: string;
  symbol: string;
  decimals: number;
    supply: string;
  marketCapUsd: string;
    pairUsd: number;
  salt: `0x${string}`;
  metadataIpfsHash: string;
  predictedToken: Address;
  pairToken: PoolPairToken;
    withdrawalAddress: Address;
    unlockTime: number;
}

export function buildDeployConfig(input: DeployConfigInput) {
  const initialSupply = parseUnits(input.supply, input.decimals);

  const pool = computeOneSidedPoolParams({
    predictedToken: input.predictedToken,
    pairToken: input.pairToken,
                initialSupplyRaw: initialSupply,
    marketCapUsd: input.marketCapUsd,
    pairUsd: input.pairUsd,
  });

  return {
    tokenParams: {
      name: input.name,
      symbol: input.symbol,
      metadataIpfsHash: input.metadataIpfsHash,
      salt: input.salt,
      decimals: input.decimals,
      initialSupply,
    },
    poolParams: {
      sqrtPriceX96: pool.sqrtPriceX96,
                        tokenAmount: initialSupply,
      pairAmountMin: 0n,
      tickLower: pool.tickLower,
      tickUpper: pool.tickUpper,
    },
    lockParams: {
      withdrawalAddress: input.withdrawalAddress,
      unlockTime: BigInt(input.unlockTime),
    },
  } as const;
}

export type DeployConfig = ReturnType<typeof buildDeployConfig>;
