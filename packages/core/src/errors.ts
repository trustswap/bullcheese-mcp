import {
  BaseError,
  ContractFunctionRevertedError,
  decodeErrorResult,
  type Abi,
  type Hex,
} from "viem";
import { MintPlusABI } from "./contracts/abi/MintPlus.js";
import { MintPlusLockerABI } from "./contracts/abi/MintPlusLocker.js";
import { SwapRouter02ExactInputSingleABI } from "./contracts/abi/SwapRouter02.js";

const DEFAULT_ABIS: readonly Abi[] = [
  MintPlusABI,
  MintPlusLockerABI,
  SwapRouter02ExactInputSingleABI,
];

export function revertName(err: unknown, abis: readonly Abi[] = DEFAULT_ABIS): string | undefined {
  if (!(err instanceof BaseError)) return undefined;
  const reverted = err.walk((e) => e instanceof ContractFunctionRevertedError);
  if (reverted instanceof ContractFunctionRevertedError && reverted.data?.errorName) {
    return reverted.data.errorName;
  }
  const raw = err.walk((e) => {
    const d = (e as { data?: unknown })?.data;
    return typeof d === "string" && d.startsWith("0x") && d.length >= 10;
  }) as { data: Hex } | null;
  if (!raw) return undefined;
  for (const abi of abis) {
    try {
      return decodeErrorResult({ abi, data: raw.data }).errorName;
    } catch {
          }
  }
  return undefined;
}
