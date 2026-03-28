"use client";

export const agentNftAbi = [
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

export const frontendConfig = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Monad Agent Marketplace",
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:8545",
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "31337"),
  agentNftAddress:
    (process.env.NEXT_PUBLIC_AGENT_NFT_ADDRESS as `0x${string}` | undefined) ??
    "0x0000000000000000000000000000000000000000",
  agentMarketplaceAddress:
    (process.env.NEXT_PUBLIC_AGENT_MARKETPLACE_ADDRESS as `0x${string}` | undefined) ??
    "0x0000000000000000000000000000000000000000",
  backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"
} as const;
