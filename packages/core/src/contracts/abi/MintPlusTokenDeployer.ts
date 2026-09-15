export const MintPlusTokenDeployerABI = [
  {
    type: "function",
    name: "computeTokenAddress",
    stateMutability: "view",
    inputs: [
      { name: "salt", type: "bytes32" },
      { name: "owner", type: "address" },
    ],
    outputs: [{ name: "", type: "address" }],
  },
] as const;
