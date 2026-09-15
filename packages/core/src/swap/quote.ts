import {
  BaseError,
  encodeAbiParameters,
  keccak256,
  maxUint256,
  MethodNotFoundRpcError,
  MethodNotSupportedRpcError,
  numberToHex,
} from "viem";
import type { Address, Hex, PublicClient, StateOverride } from "viem";
import { ERC20ABI } from "../contracts/abi/ERC20.js";
import type { MintPlusContractConfig } from "../contracts/mintplus.js";
import { buildApprove, buildExactInputSingle } from "./build.js";

export async function quoteExactInputSingle(
  client: PublicClient,
  p: {
    cfg: MintPlusContractConfig;
    tokenIn: Address;
    tokenOut: Address;
    from: Address;
    amountIn: bigint;
    payNative: boolean;
  },
): Promise<bigint> {
  const call = buildExactInputSingle({
    cfg: p.cfg,
    tokenIn: p.tokenIn,
    tokenOut: p.tokenOut,
    recipient: p.from,
    amountIn: p.amountIn,
    amountOutMinimum: 0n,
    payNative: p.payNative,
  });
  const { data } = await client.call({
    account: p.from,
    to: call.to,
    data: call.data,
    value: call.value,
  });
  if (!data) throw new Error("swap simulation returned no data");
  return BigInt(data);
}

export const SIMULATE_CALLS_UNSUPPORTED_MESSAGE =
  "this RPC cannot simulate approve+swap; configure a node with eth_simulateV1";

export async function quoteExactInputSingleWithApproval(
  client: PublicClient,
  p: {
    cfg: MintPlusContractConfig;
    tokenIn: Address;
    tokenOut: Address;
    from: Address;
    amountIn: bigint;
  },
): Promise<bigint> {
  const approveCall = buildApprove({
    token: p.tokenIn,
    spender: p.cfg.swapRouter,
    amount: p.amountIn,
  });
  const swapCall = buildExactInputSingle({
    cfg: p.cfg,
    tokenIn: p.tokenIn,
    tokenOut: p.tokenOut,
    recipient: p.from,
    amountIn: p.amountIn,
    amountOutMinimum: 0n,
    payNative: false,
  });

  let results: Awaited<ReturnType<PublicClient["simulateCalls"]>>["results"];
  try {
    ({ results } = await client.simulateCalls({
      account: p.from,
      calls: [
        { to: approveCall.to, data: approveCall.data },
        { to: swapCall.to, data: swapCall.data },
      ],
    }));
  } catch (e) {
    const slot = await findAllowanceSlot(client, p.tokenIn, p.from, p.cfg.swapRouter);
    if (slot === null) {
      if (isMethodNotFoundError(e)) throw new Error(SIMULATE_CALLS_UNSUPPORTED_MESSAGE);
      throw e;
    }
    return quoteWithAllowanceOverride(client, p, swapCall, slot);
  }

  const [approveResult, swapResult] = results;
  if (approveResult?.status === "failure") {
    throw new Error(`approve simulation reverted: ${describeSimulateFailure(approveResult)}`);
  }
  if (swapResult?.status !== "success") {
    throw new Error(`swap simulation reverted: ${describeSimulateFailure(swapResult)}`);
  }
  if (!swapResult.data) throw new Error("swap simulation returned no data");
  return BigInt(swapResult.data);
}

const OZ_ERC20_NAMESPACE = 0x52c63247e1f47db19d5ce0460030c497f067ca4cebf71ba98eeadabe20bace00n;
const PLAIN_MAPPING_SLOTS = 64n;
const MAX_WORD = numberToHex(maxUint256, { size: 32 });
const allowanceSlotCache = new Map<string, Hex>();

async function quoteWithAllowanceOverride(
  client: PublicClient,
  p: { tokenIn: Address; from: Address },
  swapCall: { to: Address; data: Hex },
  slot: Hex,
): Promise<bigint> {
  let data: Hex | undefined;
  try {
    ({ data } = await client.call({
      account: p.from,
      to: swapCall.to,
      data: swapCall.data,
      stateOverride: maxAllowanceOverride(p.tokenIn, [slot]),
    }));
  } catch (e) {
    throw new Error(`swap simulation reverted: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!data) throw new Error("swap simulation returned no data");
  return BigInt(data);
}

export async function findAllowanceSlot(
  client: PublicClient,
  token: Address,
  owner: Address,
  spender: Address,
): Promise<Hex | null> {
  const key = `${client.chain?.id ?? "?"}:${token}:${owner}:${spender}`.toLowerCase();
  const cached = allowanceSlotCache.get(key);
  if (cached) return cached;

  const bases: bigint[] = [];
  for (let i = 0n; i < PLAIN_MAPPING_SLOTS; i++) bases.push(i);
  bases.push(OZ_ERC20_NAMESPACE + 1n);
  const candidates = bases.flatMap((base) => {
    const slot = numberToHex(base, { size: 32 });
    return [mappingSlot(spender, mappingSlot(owner, slot)), mappingSlot(owner, mappingSlot(spender, slot))];
  });

  const grantsMax = async (slots: Hex[]) => {
    try {
      const allowance = await client.readContract({
        address: token,
        abi: ERC20ABI,
        functionName: "allowance",
        args: [owner, spender],
        stateOverride: maxAllowanceOverride(token, slots),
      });
      return allowance === maxUint256;
    } catch {
      return false;
    }
  };

  if (!(await grantsMax(candidates))) return null;
  let range = candidates;
  while (range.length > 1) {
    const half = range.slice(0, range.length >> 1);
    range = (await grantsMax(half)) ? half : range.slice(range.length >> 1);
  }
  const [slot] = range;
  if (slot === undefined || !(await grantsMax([slot]))) return null;
  allowanceSlotCache.set(key, slot);
  return slot;
}

function mappingSlot(key: Address, slot: Hex): Hex {
  return keccak256(encodeAbiParameters([{ type: "address" }, { type: "bytes32" }], [key, slot]));
}

function maxAllowanceOverride(token: Address, slots: Hex[]): StateOverride {
  return [{ address: token, stateDiff: slots.map((slot) => ({ slot, value: MAX_WORD })) }];
}

function describeSimulateFailure(
  result: { data?: `0x${string}`; error?: unknown } | undefined,
): string {
  if (!result) return "no result";
  if (result.error instanceof Error) return result.error.message;
  if (result.data) return result.data;
  return "unknown revert";
}

function isMethodNotFoundError(err: unknown): boolean {
  const matches = (e: unknown) =>
    e instanceof MethodNotFoundRpcError ||
    e instanceof MethodNotSupportedRpcError ||
    hasUnsupportedMethodCode(e);

  if (err instanceof BaseError) return err.walk(matches) !== null;
  if (!err) return false;
  if (matches(err)) return true;
  if (typeof err === "object" && "cause" in err) {
    return isMethodNotFoundError((err as { cause?: unknown }).cause);
  }
  return false;
}

function hasUnsupportedMethodCode(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: unknown }).code;
  return code === MethodNotFoundRpcError.code || code === MethodNotSupportedRpcError.code;
}
