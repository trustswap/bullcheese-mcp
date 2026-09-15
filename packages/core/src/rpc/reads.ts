import type { Address, Hex, PublicClient } from "viem";
import { ERC20ABI } from "../contracts/abi/ERC20.js";
import { MintPlusABI } from "../contracts/abi/MintPlus.js";
import { MintPlusLockerABI } from "../contracts/abi/MintPlusLocker.js";
import { MintPlusTokenDeployerABI } from "../contracts/abi/MintPlusTokenDeployer.js";
import type { MintPlusContractConfig } from "../contracts/mintplus.js";

export async function predictTokenAddress(
  client: PublicClient,
  cfg: MintPlusContractConfig,
  salt: Hex,
  owner: Address,
): Promise<Address> {
  return client.readContract({
    address: cfg.tokenDeployer,
    abi: MintPlusTokenDeployerABI,
    functionName: "computeTokenAddress",
    args: [salt, owner],
  });
}

export interface DeploymentInfo {
  pool: Address;
  locker: Address;
  tokenId: bigint;
  lockId: bigint;
}

export async function readDeploymentInfo(
  client: PublicClient,
  cfg: MintPlusContractConfig,
  token: Address,
): Promise<DeploymentInfo> {
  const [pool, locker, tokenId, lockId] = await client.readContract({
    address: cfg.mintPlus,
    abi: MintPlusABI,
    functionName: "deploymentInfo",
    args: [token],
  });
  return { pool, locker, tokenId, lockId };
}

export async function readErc20(
  client: PublicClient,
  token: Address,
): Promise<{ symbol: string; decimals: number }> {
  const [symbol, decimals] = await Promise.all([
    client.readContract({ address: token, abi: ERC20ABI, functionName: "symbol" }),
    client.readContract({ address: token, abi: ERC20ABI, functionName: "decimals" }),
  ]);
  return { symbol, decimals: Number(decimals) };
}

export async function readBalance(
  client: PublicClient,
  token: Address,
  owner: Address,
): Promise<bigint> {
  return client.readContract({
    address: token,
    abi: ERC20ABI,
    functionName: "balanceOf",
    args: [owner],
  });
}

export async function readAllowance(
  client: PublicClient,
  token: Address,
  owner: Address,
  spender: Address,
): Promise<bigint> {
  return client.readContract({
    address: token,
    abi: ERC20ABI,
    functionName: "allowance",
    args: [owner, spender],
  });
}

export async function readLockerOwner(client: PublicClient, locker: Address): Promise<Address> {
  return client.readContract({ address: locker, abi: MintPlusLockerABI, functionName: "owner" });
}
