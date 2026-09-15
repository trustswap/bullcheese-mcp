import { randomUUID } from "node:crypto";
import { MintPlusLockerABI, readDeploymentInfo, readLockerOwner } from "@trustswap/bullcheese-core";
import { encodeFunctionData, isAddressEqual, parseEventLogs, type Address, type Hex } from "viem";
import type { Deps } from "../deps.js";
import { auditRefusals, chainOrThrow, executeTx, markAudited, ToolError } from "./execute.js";

export interface CollectResult {
  txHash: Hex;
  locker: Address;
  token0: Address;
  token1: Address;
  ownerFee0: string;
  ownerFee1: string;
  protocolFee0: string;
  protocolFee1: string;
}

const ZERO = "0x0000000000000000000000000000000000000000";

export async function collectFees(
  deps: Deps,
  chainId: number,
  token: Address,
): Promise<CollectResult> {
  return auditRefusals(deps, { tool: "collect_fees", chainId, inputs: { chainId, token } }, () =>
    collect(deps, chainId, token),
  );
}

async function collect(deps: Deps, chainId: number, token: Address): Promise<CollectResult> {
  const chain = chainOrThrow(deps, chainId);
  const wallet = await deps.signer.address(chainId);
  const launched = await deps.audit.launchedTokens(wallet, chainId);
  if (!launched.includes(token.toLowerCase() as Address)) {
    throw new ToolError(
      "not_owner",
      `${token} is not in this wallet's launch list on chain ${chainId}`,
    );
  }
  const info = await readDeploymentInfo(chain.client, chain.cfg, token);
  if (info.locker === ZERO)
    throw new ToolError("not_launched", `${token} has no MintPlus deployment`);
  const owner = await readLockerOwner(chain.client, info.locker);
  if (!isAddressEqual(owner, wallet)) {
    throw new ToolError("not_owner", `locker ${info.locker} is owned by ${owner}, not this wallet`);
  }

  const res = await executeTx(deps, {
    chainId,
    call: {
      to: info.locker,
      data: encodeFunctionData({ abi: MintPlusLockerABI, functionName: "collectFees" }),
      value: 0n,
    },
    purpose: "collect",
    quote: { id: `collect:${randomUUID()}`, expiresAt: deps.now() + 60 },
    tool: "collect_fees",
    inputs: { chainId, token },
    extraKnownLockers: [info.locker],
  });
  const [event] = parseEventLogs({
    abi: MintPlusLockerABI,
    eventName: "FeesCollected",
    logs: res.receipt.logs.filter((l) => isAddressEqual(l.address, info.locker)),
  });
      if (!event) {
    throw markAudited(
      new ToolError("tx_failed", "collectFees succeeded but emitted no FeesCollected event"),
    );
  }
  return {
    txHash: res.txHash,
    locker: info.locker,
    token0: event.args.token0,
    token1: event.args.token1,
    ownerFee0: event.args.ownerFee0.toString(),
    ownerFee1: event.args.ownerFee1.toString(),
    protocolFee0: event.args.protocolFee0.toString(),
    protocolFee1: event.args.protocolFee1.toString(),
  };
}
