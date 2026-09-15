export const MintPlusLockerABI = [
  { type: "function", name: "collectFees", stateMutability: "nonpayable", inputs: [], outputs: [] },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "event",
    name: "FeesCollected",
    inputs: [
      { name: "caller", type: "address", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "feeCollectionAddress", type: "address", indexed: false },
      { name: "token0", type: "address", indexed: false },
      { name: "token1", type: "address", indexed: false },
      { name: "lockId", type: "uint256", indexed: true },
      { name: "protocolFee0", type: "uint256", indexed: false },
      { name: "ownerFee0", type: "uint256", indexed: false },
      { name: "protocolFee1", type: "uint256", indexed: false },
      { name: "ownerFee1", type: "uint256", indexed: false },
    ],
  },
  { type: "error", name: "LiquidityLockAlreadyWithdrawn", inputs: [] },
] as const;
