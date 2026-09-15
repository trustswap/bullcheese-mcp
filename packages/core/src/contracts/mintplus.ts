import type { Address } from "viem";

export type PairToken = {
  address: Address;
    symbol: string;
    decimals: number;
} & ({ kind: "wrapped-native" } | { kind: "stablecoin" });

export interface MintPlusContractConfig {
  mintPlus: Address;
  tokenDeployer: Address;
  tokenImplementation: Address;
  lockerDeployer: Address;
  lockerImplementation: Address;
    pairToken: PairToken;
    swapRouter: Address;
}

export const MINTPLUS_FEE_TIER = 10000;

export const MINTPLUS_CONFIG: Record<number, MintPlusContractConfig> = {
  // ARC mainnet. MintPlus reported the pair token, token deployer and locker
  // factory on 2026-09-15; the pair token is ARC's native-USDC ERC-20 view
  // (6 decimals). The router is Uniswap's SwapRouter02 from
  // Uniswap/contracts deployments/json/5042.json; its factory() and
  // positionManager() match MintPlus.positionManager().
  5042: {
    mintPlus: "0x16D4c13aD2A23288AA9b9384F24084edC8CBeF41",
    tokenDeployer: "0x8Be8dF30809CFc8FB69B41a0FBD4A1391D973f4a",
    tokenImplementation: "0x5FB8526D5FC7040959CB1a4f5a4dc88BF0468c28",
    lockerDeployer: "0x7c466B81335eD91a434711d661de17cb0E0B9AbB",
    lockerImplementation: "0x3C97Ba03df0F6152d2aAcD96d63591819e8440B8",
    pairToken: {
      address: "0x3600000000000000000000000000000000000000",
      symbol: "USDC",
      decimals: 6,
      kind: "stablecoin",
    },
    swapRouter: "0x53BF6B0684Ec7eF91e1387Da3D1a1769bC5A6F77",
  },
};

export function getMintPlusConfig(chainId: number): MintPlusContractConfig | undefined {
  return MINTPLUS_CONFIG[chainId];
}

export function isMintPlusChain(chainId: number | undefined): boolean {
  return chainId !== undefined && getMintPlusConfig(chainId) !== undefined;
}
