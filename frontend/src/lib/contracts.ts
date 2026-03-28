export const agentNftAbi = [
  {
    type: "function",
    stateMutability: "view",
    name: "getApproved",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "function",
    stateMutability: "view",
    name: "isApprovedForAll",
    inputs: [
      { name: "ownerAddress", type: "address" },
      { name: "operator", type: "address" }
    ],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "approve",
    inputs: [
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" }
    ],
    outputs: []
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "setAgentActiveStatus",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "isActive", type: "bool" }
    ],
    outputs: []
  }
] as const;

export const marketplaceAbi = [
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "listAgent",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "price", type: "uint256" }
    ],
    outputs: []
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "cancelListing",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    stateMutability: "payable",
    name: "buyAgent",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "setUsagePrice",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "price", type: "uint256" }
    ],
    outputs: []
  },
  {
    type: "function",
    stateMutability: "payable",
    name: "payForUsage",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "entitlementId", type: "uint256" }]
  },
  {
    type: "event",
    name: "UsageEntitlementPurchased",
    inputs: [
      { indexed: true, name: "entitlementId", type: "uint256" },
      { indexed: true, name: "tokenId", type: "uint256" },
      { indexed: true, name: "buyer", type: "address" },
      { indexed: false, name: "owner", type: "address" },
      { indexed: false, name: "price", type: "uint256" }
    ]
  }
] as const;

function readEnv(value: string | undefined, fallback: string) {
  if (!value) return fallback;

  const trimmed = value.trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "null") {
    return fallback;
  }

  return trimmed;
}

export const frontendConfig = {
  demoMode: readEnv(process.env.NEXT_PUBLIC_DEMO_MODE, "false") === "true",
  appName: readEnv(process.env.NEXT_PUBLIC_APP_NAME, "Monad Agent Marketplace"),
  rpcUrl: readEnv(process.env.NEXT_PUBLIC_RPC_URL, "http://127.0.0.1:8545"),
  chainId: Number(readEnv(process.env.NEXT_PUBLIC_CHAIN_ID, "31337")),
  agentNftAddress:
    (readEnv(
      process.env.NEXT_PUBLIC_AGENT_NFT_ADDRESS as `0x${string}` | undefined,
      "0x0000000000000000000000000000000000000000"
    ) as `0x${string}`) ??
    "0x0000000000000000000000000000000000000000",
  agentMarketplaceAddress:
    (readEnv(
      process.env.NEXT_PUBLIC_AGENT_MARKETPLACE_ADDRESS as `0x${string}` | undefined,
      "0x0000000000000000000000000000000000000000"
    ) as `0x${string}`) ??
    "0x0000000000000000000000000000000000000000",
  backendUrl: readEnv(process.env.NEXT_PUBLIC_BACKEND_URL, "http://localhost:3001")
} as const;
