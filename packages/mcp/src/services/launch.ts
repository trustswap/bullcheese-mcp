import {
  buildApprove,
  buildDeployConfig,
  buildExactInputSingle,
  generateSalt,
  LOCK_DURATION_BUFFER_SECONDS,
  LOCK_PRESETS,
  MARKET_CAP_PRESETS,
  MintPlusABI,
  minOutFor,
  parseAmount,
  predictTokenAddress,
  presetTokenPriceUsd,
  quoteExactInputSingle,
  readAllowance,
  readDeploymentInfo,
  validateTokenDetails,
  type DeploymentInfo,
  type MarketCapPreset,
} from "@trustswap/bullcheese-core";
import { encodeFunctionData, parseEventLogs, type Address, type Hex } from "viem";
import type { Deps } from "../deps.js";
import { redactUrls } from "../errors.js";
import type { LaunchInput, LaunchMetadata, LaunchQuote } from "../quotes.js";
import type { MintPlusLaunch, MintPlusLaunchWithMarket } from "../tfApi/query.js";
import {
  auditRefusals,
  chainOrThrow,
  executeTx,
  markAudited,
  ToolError,
  type RefusalContext,
} from "./execute.js";

export interface LaunchQuoteView {
  quoteId: string;
  expiresAt: number;
  chainId: number;
  wallet: Address;
  predictedToken: Address;
  tokenIsToken0: boolean;
  initialSupply: string;
  marketCapUsd: string;
  tokenPriceUsd: number;
  unlockTime: number;
  pairToken: { symbol: string; address: Address };
  devBuy?: { amountIn: string };
  estimatedGas: string;
  metadataSource: "pinned" | "to_pin" | "none";
}

type QuoteInput = LaunchInput & { metadata?: LaunchMetadata; metadataIpfsHash?: string };

const IMAGE_URI_RE = /^(ipfs|https):\/\/(.*)$/i;

function assertImageUri(image: string | undefined): void {
  if (image === undefined) return;
  const match = IMAGE_URI_RE.exec(image);
  if (!match) {
    throw new ToolError(
      "invalid_input",
      "image must be an ipfs:// or https:// URI; use pin_image for raw bytes",
    );
  }
        const authority = match[2]!.split(/[/?#]/, 1)[0] ?? "";
  if (authority.includes("@")) {
    throw new ToolError("invalid_input", "image URL must not carry credentials");
  }
}

function marketCapPresetOrThrow(label: string): MarketCapPreset {
  const preset = MARKET_CAP_PRESETS.find((p) => p.label === label);
  if (!preset) throw new ToolError("invalid_input", `unknown market cap preset ${label}`);
  return preset;
}

async function pinLaunchMetadata(deps: Deps, metadata: LaunchMetadata) {
  if (!deps.ipfs) {
    throw new ToolError("invalid_input", "metadata pinning needs BULLCHEESE_PINATA_JWT");
  }
  const uri = await deps.ipfs.pinJson(metadata, `${metadata.symbol} metadata`);
  return uri.replace(/^ipfs:\/\//, "");
}

export async function quoteLaunch(
  deps: Deps,
  input: QuoteInput,
  pairUsd: (chainId: number) => Promise<number>,
): Promise<LaunchQuoteView> {
  const marketCap = marketCapPresetOrThrow(input.marketCapPreset);
  const errors = validateTokenDetails({
    name: input.name,
    symbol: input.symbol,
    decimals: input.decimals,
    supply: marketCap.supply,
  });
  if (Object.keys(errors).length > 0) {
    throw new ToolError("invalid_input", Object.values(errors).join(" "), errors);
  }
  if (input.metadata) {
    assertImageUri(input.metadata.image);
    if (!deps.ipfs) {
      throw new ToolError(
        "invalid_input",
        "metadata pinning needs BULLCHEESE_PINATA_JWT; pass metadataIpfsHash instead",
      );
    }
  }
  const chain = chainOrThrow(deps, input.chainId);
  const wallet = await deps.signer.address(input.chainId);
  const preset = LOCK_PRESETS.find((p) => p.label === input.lockPreset);
  if (!preset) throw new ToolError("invalid_input", `unknown lock preset ${input.lockPreset}`);

  const salt = generateSalt();
  const predictedToken = await predictTokenAddress(chain.client, chain.cfg, salt, wallet);
  const unlockTime = deps.now() + preset.seconds + LOCK_DURATION_BUFFER_SECONDS;
  const pairUsdValue = await pairUsd(input.chainId);
  const deployConfig = buildDeployConfig({
    name: input.name,
    symbol: input.symbol,
    decimals: input.decimals,
    supply: marketCap.supply,
    marketCapUsd: marketCap.marketCapUsd,
    pairUsd: pairUsdValue,
    salt,
    metadataIpfsHash: input.metadataIpfsHash ?? "",
    predictedToken,
    pairToken: chain.cfg.pairToken,
    withdrawalAddress: wallet,
    unlockTime,
  });

  let devBuy: { amountIn: bigint } | undefined;
  if (input.devBuy) {
    const amountIn = parseAmount(input.devBuy, chain.cfg.pairToken.decimals);
    if (amountIn === null || amountIn <= 0n) {
      throw new ToolError("invalid_input", "devBuy must be a positive pair-token amount");
    }
    devBuy = { amountIn };
  }

  const base: Omit<LaunchQuote, "id" | "expiresAt"> = {
    kind: "launch",
    chainId: input.chainId,
    wallet,
    input,
    salt,
    predictedToken,
    deployConfig,
    pairUsd: pairUsdValue,
    ...(input.metadata ? { metadata: input.metadata } : {}),
    ...(input.metadataIpfsHash ? { metadataIpfsHash: input.metadataIpfsHash } : {}),
    ...(devBuy ? { devBuy } : {}),
  };
  const quote = deps.quotes.put(base);
  const tokenIsToken0 = predictedToken.toLowerCase() < chain.cfg.pairToken.address.toLowerCase();
  return {
    quoteId: quote.id,
    expiresAt: quote.expiresAt,
    chainId: input.chainId,
    wallet,
    predictedToken,
    tokenIsToken0,
    initialSupply: deployConfig.tokenParams.initialSupply.toString(),
    marketCapUsd: marketCap.marketCapUsd,
    tokenPriceUsd: presetTokenPriceUsd(marketCap),
    unlockTime,
    pairToken: { symbol: chain.cfg.pairToken.symbol, address: chain.cfg.pairToken.address },
    ...(devBuy ? { devBuy: { amountIn: devBuy.amountIn.toString() } } : {}),
    estimatedGas: "estimated at execution",
    metadataSource: input.metadata ? "to_pin" : input.metadataIpfsHash ? "pinned" : "none",
  };
}

export const LAUNCH_EXECUTION_WINDOW_SECONDS = 600;

export interface LaunchResult {
  txHash: Hex;
  token: Address;
  pool: Address;
  locker: Address;
  tokenId: string;
  lockId: string;
  retriedWithFreshSalt: boolean;
  devBuy?: { approvalTxHash?: Hex; txHash?: Hex; amountOut?: string; error?: string };
}

export async function launchToken(deps: Deps, quoteId: string): Promise<LaunchResult> {
  const ctx: RefusalContext = { tool: "launch_token", inputs: { quoteId } };
  return auditRefusals(deps, ctx, () => launch(deps, quoteId, ctx));
}

async function launch(deps: Deps, quoteId: string, ctx: RefusalContext): Promise<LaunchResult> {
  const quote = deps.quotes.take(quoteId);
      ctx.chainId = quote.chainId;
          const takenAt = deps.now();
  const binding = { id: quote.id, expiresAt: takenAt + LAUNCH_EXECUTION_WINDOW_SECONDS };
  if (quote.kind !== "launch")
    throw new ToolError("invalid_input", `${quoteId} is not a launch quote`);
  const chain = chainOrThrow(deps, quote.chainId);
  const wallet = quote.wallet;

    let metadataIpfsHash = quote.metadataIpfsHash ?? "";
  if (quote.metadata) {
    metadataIpfsHash = await pinLaunchMetadata(deps, quote.metadata);
  }

    let salt = quote.salt;
  let predictedToken = quote.predictedToken;
  let deployConfig = {
    ...quote.deployConfig,
    tokenParams: { ...quote.deployConfig.tokenParams, metadataIpfsHash },
  };
  let retried = false;
  let executed;
  for (let attempt = 0; ; attempt += 1) {
    await deps.audit.markSalt(wallet, quote.chainId, salt, "pending");
    try {
      executed = await executeTx(deps, {
        chainId: quote.chainId,
        call: {
          to: chain.cfg.mintPlus,
          data: encodeFunctionData({
            abi: MintPlusABI,
            functionName: "deploy",
            args: [deployConfig],
          }),
          value: 0n,
        },
        purpose: "launch",
        quote: binding,
        tool: "launch_token",
        inputs: { quoteId, attempt, predictedToken },
      });
      await deps.audit.markSalt(wallet, quote.chainId, salt, "consumed");
      break;
    } catch (e) {
      await deps.audit.markSalt(wallet, quote.chainId, salt, "failed");
      const revert =
        e instanceof ToolError ? (e.details as { revertName?: string })?.revertName : undefined;
      if (attempt === 0 && revert === "InvalidPoolPrice") {
        retried = true;
        salt = generateSalt();
        predictedToken = await predictTokenAddress(chain.client, chain.cfg, salt, wallet);
        const marketCap = marketCapPresetOrThrow(quote.input.marketCapPreset);
        deployConfig = buildDeployConfig({
          name: quote.input.name,
          symbol: quote.input.symbol,
          decimals: quote.input.decimals,
          supply: marketCap.supply,
          marketCapUsd: marketCap.marketCapUsd,
          pairUsd: quote.pairUsd,
          salt,
          metadataIpfsHash,
          predictedToken,
          pairToken: chain.cfg.pairToken,
          withdrawalAddress: wallet,
          unlockTime: Number(quote.deployConfig.lockParams.unlockTime),
        });
        continue;
      }
      throw e;
    }
  }

  const [event] = parseEventLogs({
    abi: MintPlusABI,
    eventName: "MintPlusDeployed",
    logs: executed.receipt.logs,
  });
      if (!event) {
    throw markAudited(
      new ToolError("tx_failed", "deploy succeeded but emitted no MintPlusDeployed event"),
    );
  }
  if (!("token" in event.args)) {
    throw markAudited(
      new ToolError("tx_failed", "deploy succeeded but the MintPlusDeployed event was unparsable"),
    );
  }
  const { token, pool, locker, tokenId, lockId } = event.args;
  await deps.audit.recordLaunch({
    wallet,
    chainId: quote.chainId,
    token,
    txHash: executed.txHash,
    ts: deps.now(),
  });

    let devBuy: LaunchResult["devBuy"];
  if (quote.devBuy) {
    devBuy = {};
    try {
      const payNative = chain.cfg.pairToken.kind === "wrapped-native";
      if (!payNative) {
        const allowance = await readAllowance(
          chain.client,
          chain.cfg.pairToken.address,
          wallet,
          chain.cfg.swapRouter,
        );
        if (allowance < quote.devBuy.amountIn) {
          const approval = await executeTx(deps, {
            chainId: quote.chainId,
            call: buildApprove({
              token: chain.cfg.pairToken.address,
              spender: chain.cfg.swapRouter,
              amount: quote.devBuy.amountIn,
            }),
            purpose: "approve",
            quote: { ...binding, amountIn: quote.devBuy.amountIn },
            tool: "launch_token.devBuy.approve",
            inputs: { quoteId, token },
            extraKnownTokens: [token],
          });
          devBuy.approvalTxHash = approval.txHash;
        }
      }
      const expectedOut = await quoteExactInputSingle(chain.client, {
        cfg: chain.cfg,
        tokenIn: chain.cfg.pairToken.address,
        tokenOut: token,
        from: wallet,
        amountIn: quote.devBuy.amountIn,
        payNative,
      });
      const slippageBps = 100;
      const call = buildExactInputSingle({
        cfg: chain.cfg,
        tokenIn: chain.cfg.pairToken.address,
        tokenOut: token,
        recipient: wallet,
        amountIn: quote.devBuy.amountIn,
        amountOutMinimum: minOutFor(expectedOut, slippageBps),
        payNative,
      });
      const res = await executeTx(deps, {
        chainId: quote.chainId,
        call,
        purpose: "swap",
        quote: {
          ...binding,
          expectedOut,
          slippageBps,
          amountIn: quote.devBuy.amountIn,
        },
        tool: "launch_token.devBuy",
        inputs: { quoteId, token },
        extraKnownTokens: [token],
      });
      devBuy.txHash = res.txHash;
      devBuy.amountOut = expectedOut.toString();
    } catch (e) {
      devBuy.error = redactUrls(String(e));
    }
  }

  return {
    txHash: executed.txHash,
    token,
    pool,
    locker,
    tokenId: tokenId.toString(),
    lockId: lockId.toString(),
    retriedWithFreshSalt: retried,
    ...(devBuy ? { devBuy } : {}),
  };
}

export async function getLaunch(
  deps: Deps,
  chainId: number,
  token: Address,
): Promise<{ onChain: DeploymentInfo | null; indexed: MintPlusLaunchWithMarket | null }> {
  const chain = chainOrThrow(deps, chainId);
  const info = await readDeploymentInfo(chain.client, chain.cfg, token);
  const onChain = info.pool === "0x0000000000000000000000000000000000000000" ? null : info;
  const indexed = deps.tfApiQuery ? await deps.tfApiQuery.launchByToken(token, chainId) : null;
  return { onChain, indexed };
}

export async function listMyLaunches(
  deps: Deps,
  chainId: number,
): Promise<{ indexed: MintPlusLaunch[]; local: Address[] }> {
  chainOrThrow(deps, chainId);
  const wallet = await deps.signer.address(chainId);
  const local = await deps.audit.launchedTokens(wallet, chainId);
  const indexed = deps.tfApiQuery ? await deps.tfApiQuery.launchesByOwner(wallet, chainId) : [];
  return { indexed, local };
}
