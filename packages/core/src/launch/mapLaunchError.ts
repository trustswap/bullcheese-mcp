const MESSAGES: Record<string, string> = {
  InvalidInitialSupply: "Total supply is outside the allowed range.",
  InvalidDecimals: "Decimals must be between 8 and 18.",
  InvalidTokenNameLength: "Token name length is invalid.",
  InvalidTokenSymbolLength: "Token symbol length is invalid.",
  InvalidUnlockTime: "The unlock time is invalid (minimum lock is 30 days).",
  InvalidTickRange: "The computed price range is invalid.",
  InvalidTickSpacing: "The computed price range is invalid.",
  InvalidPoolPrice: "The pool price changed.",
  InvalidTokenAddress: "The predicted token address did not match.",
  TokenOnlyPoolRequiresFullSupply: "A one-sided pool must use the full token supply.",
  EnforcedPause: "MintPlus is currently paused.",
};

export function mapLaunchError(err: { name?: string } | undefined | null): string {
  const name = err?.name;
  if (name && MESSAGES[name]) return MESSAGES[name];
  return "The launch transaction failed.";
}
