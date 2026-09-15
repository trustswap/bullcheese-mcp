export const MintPlusABI = [
  {
    type: "constructor",
    inputs: [
      {
        name: "deployerConfig",
        type: "tuple",
        internalType: "struct IMintPlus.DeployerConfig",
        components: [
          {
            name: "initialOwner",
            type: "address",
            internalType: "address",
          },
          {
            name: "positionManager",
            type: "address",
            internalType: "address",
          },
          { name: "weth", type: "address", internalType: "address" },
          {
            name: "teamFinanceLocker",
            type: "address",
            internalType: "address",
          },
          {
            name: "tokenDeployer",
            type: "address",
            internalType: "address",
          },
          {
            name: "lockerFactory",
            type: "address",
            internalType: "address",
          },
          {
            name: "feeCollectionAddress",
            type: "address",
            internalType: "address",
          },
          {
            name: "protocolFee",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "minimumLiquidityTokenPercentage",
            type: "uint256",
            internalType: "uint256",
          },
        ],
      },
    ],
    stateMutability: "payable",
  },
  { type: "receive", stateMutability: "payable" },
  {
    type: "function",
    name: "INTEGRATION_UPDATE_DELAY",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "WETH",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "contract IWETH" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "acceptOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "computeLiquidityAmounts",
    inputs: [
      {
        name: "poolParams",
        type: "tuple",
        internalType: "struct IMintPlus.PoolParams",
        components: [
          {
            name: "sqrtPriceX96",
            type: "uint160",
            internalType: "uint160",
          },
          {
            name: "tokenAmount",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "pairAmountMin",
            type: "uint256",
            internalType: "uint256",
          },
          { name: "tickLower", type: "int24", internalType: "int24" },
          { name: "tickUpper", type: "int24", internalType: "int24" },
        ],
      },
      {
        name: "initialSupply",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "tokenAddress",
        type: "address",
        internalType: "address",
      },
      { name: "pairAddress", type: "address", internalType: "address" },
    ],
    outputs: [{ name: "pairAmount", type: "uint256", internalType: "uint256" }],
    stateMutability: "pure",
  },
  {
    type: "function",
    name: "deploy",
    inputs: [
      {
        name: "deploymentConfig",
        type: "tuple",
        internalType: "struct IMintPlus.DeploymentConfig",
        components: [
          {
            name: "tokenParams",
            type: "tuple",
            internalType: "struct IMintPlus.TokenParams",
            components: [
              { name: "name", type: "string", internalType: "string" },
              {
                name: "symbol",
                type: "string",
                internalType: "string",
              },
              {
                name: "metadataIpfsHash",
                type: "string",
                internalType: "string",
              },
              {
                name: "salt",
                type: "bytes32",
                internalType: "bytes32",
              },
              {
                name: "decimals",
                type: "uint8",
                internalType: "uint8",
              },
              {
                name: "initialSupply",
                type: "uint256",
                internalType: "uint256",
              },
            ],
          },
          {
            name: "poolParams",
            type: "tuple",
            internalType: "struct IMintPlus.PoolParams",
            components: [
              {
                name: "sqrtPriceX96",
                type: "uint160",
                internalType: "uint160",
              },
              {
                name: "tokenAmount",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "pairAmountMin",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "tickLower",
                type: "int24",
                internalType: "int24",
              },
              {
                name: "tickUpper",
                type: "int24",
                internalType: "int24",
              },
            ],
          },
          {
            name: "lockParams",
            type: "tuple",
            internalType: "struct IMintPlus.LockParams",
            components: [
              {
                name: "withdrawalAddress",
                type: "address",
                internalType: "address",
              },
              {
                name: "unlockTime",
                type: "uint256",
                internalType: "uint256",
              },
            ],
          },
        ],
      },
    ],
    outputs: [
      { name: "token", type: "address", internalType: "address" },
      { name: "pool", type: "address", internalType: "address" },
      {
        name: "mintPlusLocker",
        type: "address",
        internalType: "address",
      },
      { name: "tokenId", type: "uint256", internalType: "uint256" },
      { name: "lockId", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "deploymentInfo",
    inputs: [{ name: "tokenAddress", type: "address", internalType: "address" }],
    outputs: [
      { name: "pool", type: "address", internalType: "address" },
      { name: "locker", type: "address", internalType: "address" },
      { name: "tokenId", type: "uint256", internalType: "uint256" },
      { name: "lockId", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "executeFeeCollectionAddressUpdate",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "executeLockerFactoryUpdate",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "executeTeamFinanceLockerUpdate",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "executeTokenDeployerUpdate",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "feeCollectionAddress",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "feeCollectorAdmins",
    inputs: [
      {
        name: "feeCollectorAdmin",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [{ name: "approved", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "lockerFactory",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract IMintPlusLockerFactory",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "maximumInitialSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "minimumInitialSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "minimumLiquidityTokenPercentage",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "minimumLockDuration",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pause",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "paused",
    inputs: [],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pendingFeeCollectionAddressUpdate",
    inputs: [],
    outputs: [
      { name: "newAddress", type: "address", internalType: "address" },
      { name: "executeAfter", type: "uint48", internalType: "uint48" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pendingLockerFactoryUpdate",
    inputs: [],
    outputs: [
      { name: "newAddress", type: "address", internalType: "address" },
      { name: "executeAfter", type: "uint48", internalType: "uint48" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pendingOwner",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pendingTeamFinanceLockerUpdate",
    inputs: [],
    outputs: [
      { name: "newAddress", type: "address", internalType: "address" },
      { name: "executeAfter", type: "uint48", internalType: "uint48" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pendingTokenDeployerUpdate",
    inputs: [],
    outputs: [
      { name: "newAddress", type: "address", internalType: "address" },
      { name: "executeAfter", type: "uint48", internalType: "uint48" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "positionManager",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract INonfungiblePositionManager",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "protocolFee",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "renounceOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setFee",
    inputs: [{ name: "newFee", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setFeeCollectionAddress",
    inputs: [
      {
        name: "newFeeCollectionAddress",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setFeeCollectorAdmin",
    inputs: [
      {
        name: "feeCollectorAdmin",
        type: "address",
        internalType: "address",
      },
      { name: "approved", type: "bool", internalType: "bool" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setLockerFactory",
    inputs: [
      {
        name: "newLockerFactory",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setMinMaxInitialSupply",
    inputs: [
      {
        name: "newMinimumInitialSupply",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "newMaximumInitialSupply",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setMinimumLiquidityTokenPercentage",
    inputs: [
      {
        name: "newMinimumLiquidityTokenPercentage",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setMinimumLockDuration",
    inputs: [
      {
        name: "newMinimumLockDuration",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setTeamFinanceLocker",
    inputs: [
      {
        name: "newTeamFinanceLocker",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setTokenDeployer",
    inputs: [
      {
        name: "newTokenDeployer",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "teamFinanceLocker",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract ITeamFinanceLocker",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "tokenDeployer",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract IMintPlusTokenDeployer",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [{ name: "newOwner", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "unpause",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "FeeCollectionAddressUpdateProposed",
    inputs: [
      {
        name: "currentFeeCollectionAddress",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newFeeCollectionAddress",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "executeAfter",
        type: "uint48",
        indexed: false,
        internalType: "uint48",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "FeeCollectionAddressUpdated",
    inputs: [
      {
        name: "previousFeeCollectionAddress",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newFeeCollectionAddress",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "FeeCollectorAdminUpdated",
    inputs: [
      {
        name: "feeCollectorAdmin",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "approved",
        type: "bool",
        indexed: false,
        internalType: "bool",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "FeeUpdated",
    inputs: [
      {
        name: "previousFee",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "newFee",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "LockerFactoryUpdateProposed",
    inputs: [
      {
        name: "currentLockerFactory",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newLockerFactory",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "executeAfter",
        type: "uint48",
        indexed: false,
        internalType: "uint48",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "LockerFactoryUpdated",
    inputs: [
      {
        name: "previousLockerFactory",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newLockerFactory",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "MinMaxInitialSupplyUpdated",
    inputs: [
      {
        name: "previousMinimumInitialSupply",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "previousMaximumInitialSupply",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "newMinimumInitialSupply",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "newMaximumInitialSupply",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "MinimumLiquidityTokenPercentageUpdated",
    inputs: [
      {
        name: "previousMinimumLiquidityTokenPercentage",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "newMinimumLiquidityTokenPercentage",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "MinimumLockDurationUpdated",
    inputs: [
      {
        name: "previousMinimumLockDuration",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "newMinimumLockDuration",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "MintPlusDeployed",
    inputs: [
      {
        name: "deployer",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "token",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "pool",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "locker",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "tokenId",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "lockId",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "recipient",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "withdrawalAddress",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "tokenAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "pairAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "tokenAmountUsed",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "pairAmountUsed",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferStarted",
    inputs: [
      {
        name: "previousOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      {
        name: "previousOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Paused",
    inputs: [
      {
        name: "account",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TeamFinanceLockerUpdateProposed",
    inputs: [
      {
        name: "currentTeamFinanceLocker",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newTeamFinanceLocker",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "executeAfter",
        type: "uint48",
        indexed: false,
        internalType: "uint48",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TeamFinanceLockerUpdated",
    inputs: [
      {
        name: "previousTeamFinanceLocker",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newTeamFinanceLocker",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TokenDeployerUpdateProposed",
    inputs: [
      {
        name: "currentTokenDeployer",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newTokenDeployer",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "executeAfter",
        type: "uint48",
        indexed: false,
        internalType: "uint48",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TokenDeployerUpdated",
    inputs: [
      {
        name: "previousTokenDeployer",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newTokenDeployer",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Unpaused",
    inputs: [
      {
        name: "account",
        type: "address",
        indexed: false,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  { type: "error", name: "ETHRefundFailed", inputs: [] },
  { type: "error", name: "EnforcedPause", inputs: [] },
  { type: "error", name: "ExpectedPause", inputs: [] },
  {
    type: "error",
    name: "InsufficientETHSent",
    inputs: [
      { name: "sent", type: "uint256", internalType: "uint256" },
      { name: "required", type: "uint256", internalType: "uint256" },
    ],
  },
  { type: "error", name: "InvalidAddress", inputs: [] },
  {
    type: "error",
    name: "InvalidDecimals",
    inputs: [{ name: "decimals", type: "uint8", internalType: "uint8" }],
  },
  {
    type: "error",
    name: "InvalidFee",
    inputs: [{ name: "fee", type: "uint256", internalType: "uint256" }],
  },
  {
    type: "error",
    name: "InvalidInitialSupply",
    inputs: [
      {
        name: "initialSupply",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "minimumInitialSupply",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "maximumInitialSupply",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidLockerAddress",
    inputs: [
      {
        name: "computedLockerAddress",
        type: "address",
        internalType: "address",
      },
      {
        name: "actualLockerAddress",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidMinMaxInitialSupply",
    inputs: [
      {
        name: "minimumInitialSupply",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "maximumInitialSupply",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidMinimumLiquidityTokenPercentage",
    inputs: [
      {
        name: "minimumLiquidityTokenPercentage",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidPairAmountMin",
    inputs: [
      {
        name: "pairAmountMin",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "pairAmount", type: "uint256", internalType: "uint256" },
    ],
  },
  {
    type: "error",
    name: "InvalidPoolPrice",
    inputs: [
      {
        name: "actualSqrtPriceX96",
        type: "uint160",
        internalType: "uint160",
      },
      {
        name: "expectedSqrtPriceX96",
        type: "uint160",
        internalType: "uint160",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidTickRange",
    inputs: [
      { name: "tickLower", type: "int24", internalType: "int24" },
      { name: "tickUpper", type: "int24", internalType: "int24" },
    ],
  },
  {
    type: "error",
    name: "InvalidTickSpacing",
    inputs: [
      { name: "tickLower", type: "int24", internalType: "int24" },
      { name: "tickUpper", type: "int24", internalType: "int24" },
      { name: "tickSpacing", type: "int24", internalType: "int24" },
    ],
  },
  {
    type: "error",
    name: "InvalidTokenAddress",
    inputs: [
      {
        name: "predictedTokenAddress",
        type: "address",
        internalType: "address",
      },
      {
        name: "actualTokenAddress",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidTokenNameLength",
    inputs: [
      { name: "nameLength", type: "uint256", internalType: "uint256" },
      {
        name: "maximumNameLength",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidTokenSymbolLength",
    inputs: [
      {
        name: "symbolLength",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "maximumSymbolLength",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidUnlockTime",
    inputs: [{ name: "unlockTime", type: "uint256", internalType: "uint256" }],
  },
  { type: "error", name: "InvalidWithdrawalAddress", inputs: [] },
  { type: "error", name: "NoPendingUpdate", inputs: [] },
  {
    type: "error",
    name: "OwnableInvalidOwner",
    inputs: [{ name: "owner", type: "address", internalType: "address" }],
  },
  {
    type: "error",
    name: "OwnableUnauthorizedAccount",
    inputs: [{ name: "account", type: "address", internalType: "address" }],
  },
  { type: "error", name: "ReentrancyGuardReentrantCall", inputs: [] },
  {
    type: "error",
    name: "SafeERC20FailedOperation",
    inputs: [{ name: "token", type: "address", internalType: "address" }],
  },
  { type: "error", name: "T", inputs: [] },
  {
    type: "error",
    name: "TimelockNotElapsed",
    inputs: [
      { name: "currentTime", type: "uint256", internalType: "uint256" },
      { name: "executeAfter", type: "uint48", internalType: "uint48" },
    ],
  },
  {
    type: "error",
    name: "Token0PriceAboveRange",
    inputs: [
      {
        name: "sqrtPriceX96",
        type: "uint160",
        internalType: "uint160",
      },
      {
        name: "sqrtPriceUpper",
        type: "uint160",
        internalType: "uint160",
      },
    ],
  },
  {
    type: "error",
    name: "Token1PriceBelowRange",
    inputs: [
      {
        name: "sqrtPriceX96",
        type: "uint160",
        internalType: "uint160",
      },
      {
        name: "sqrtPriceLower",
        type: "uint160",
        internalType: "uint160",
      },
    ],
  },
  {
    type: "error",
    name: "TokenAmountBelowMinimumLiquidity",
    inputs: [
      { name: "tokenAmount", type: "uint256", internalType: "uint256" },
      {
        name: "minimumTokenAmount",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "TokenAmountExceedsInitialSupply",
    inputs: [
      { name: "tokenAmount", type: "uint256", internalType: "uint256" },
      {
        name: "initialSupply",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "TokenOnlyPoolRequiresFullSupply",
    inputs: [
      { name: "tokenAmount", type: "uint256", internalType: "uint256" },
      {
        name: "initialSupply",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
] as const;
