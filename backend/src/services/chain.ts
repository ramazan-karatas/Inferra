import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
  parseAbiItem
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { config } from "../config.js";
import { getSeededAgentDefinition } from "./agents.js";
import type { AgentCard, AgentMetadata } from "../types.js";

const agentNftArtifact = JSON.parse(
  readFileSync(resolve(process.cwd(), "../contracts/out/AgentNFT.sol/AgentNFT.json"), "utf8")
) as { abi: unknown[] };

const marketplaceArtifact = JSON.parse(
  readFileSync(
    resolve(process.cwd(), "../contracts/out/AgentMarketplace.sol/AgentMarketplace.json"),
    "utf8"
  )
) as { abi: unknown[] };

type AgentInfoResult =
  | readonly [string, string, string, string, string, bigint, bigint, bigint, boolean]
  | {
      creator: string;
      metadataURI: string;
      agentKey: string;
      version: string;
      maintainer: string;
      usageCount: bigint;
      successCount: bigint;
      failureCount: bigint;
      isActive: boolean;
    };

type ListingResult =
  | readonly [string, bigint, boolean]
  | {
      seller: string;
      price: bigint;
      active: boolean;
    };

type NormalizedAgentInfo = {
  creator: string;
  metadataURI: string;
  agentKey: string;
  version: string;
  maintainer: string;
  usageCount: bigint;
  successCount: bigint;
  failureCount: bigint;
  isActive: boolean;
};

type NormalizedListing = {
  seller: string;
  price: bigint;
  active: boolean;
};

const chain = {
  id: config.chainId,
  name: "Monad MVP",
  nativeCurrency: {
    name: "Native",
    symbol: "NATIVE",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: [config.rpcUrl]
    }
  }
} as const;

const finalizerAccount = privateKeyToAccount(config.finalizerPrivateKey as `0x${string}`);

const mockAgentState = new Map<number, AgentCard>([
  [
    1,
    {
      tokenId: 1,
      name: "Research Agent",
      description: "Turns a prompt into a concise research brief.",
      category: "Research",
      image: "",
      promptHint: "Analyze the current market for AI-native commerce protocols.",
      owner: "0x1111111111111111111111111111111111111111",
      creator: "0x1111111111111111111111111111111111111111",
      isListed: true,
      salePrice: "1000000000000000000",
      usagePrice: "100000000000000000",
      usageCount: 0,
      successCount: 0,
      failureCount: 0,
      isActive: true,
      version: "1.0.0",
      maintainer: "0x1111111111111111111111111111111111111111",
      agentKey: "research-agent"
    }
  ],
  [
    2,
    {
      tokenId: 2,
      name: "Marketing Copy Agent",
      description: "Produces launch-ready marketing copy.",
      category: "Marketing",
      image: "",
      promptHint: "Write launch copy for an ownable AI agent marketplace.",
      owner: "0x2222222222222222222222222222222222222222",
      creator: "0x2222222222222222222222222222222222222222",
      isListed: false,
      salePrice: "0",
      usagePrice: "50000000000000000",
      usageCount: 0,
      successCount: 0,
      failureCount: 0,
      isActive: true,
      version: "1.0.0",
      maintainer: "0x2222222222222222222222222222222222222222",
      agentKey: "marketing-copy-agent"
    }
  ],
  [
    3,
    {
      tokenId: 3,
      name: "Summarizer Agent",
      description: "Summarizes long input into key points.",
      category: "Productivity",
      image: "",
      promptHint: "Summarize the key value proposition of on-chain agent commerce.",
      owner: "0x3333333333333333333333333333333333333333",
      creator: "0x3333333333333333333333333333333333333333",
      isListed: false,
      salePrice: "0",
      usagePrice: "25000000000000000",
      usageCount: 0,
      successCount: 0,
      failureCount: 0,
      isActive: true,
      version: "1.0.0",
      maintainer: "0x3333333333333333333333333333333333333333",
      agentKey: "summarizer-agent"
    }
  ]
]);

export const publicClient = createPublicClient({
  chain,
  transport: http(config.rpcUrl)
});

export const walletClient = createWalletClient({
  account: finalizerAccount,
  chain,
  transport: http(config.rpcUrl)
});

export async function readAgentCard(tokenId: number): Promise<AgentCard> {
  if (config.demoMode) {
    const agent = mockAgentState.get(tokenId);
    if (!agent) throw new Error("Mock agent not found.");
    return structuredClone(agent);
  }

  const [ownerResult, agentInfo, listing, usagePrice, listingValidity] = await Promise.all([
    publicClient.readContract({
      address: config.agentNftAddress as `0x${string}`,
      abi: agentNftArtifact.abi,
      functionName: "ownerOf",
      args: [BigInt(tokenId)]
    }),
    publicClient.readContract({
      address: config.agentNftAddress as `0x${string}`,
      abi: agentNftArtifact.abi,
      functionName: "getAgentInfo",
      args: [BigInt(tokenId)]
    }),
    publicClient.readContract({
      address: config.agentMarketplaceAddress as `0x${string}`,
      abi: marketplaceArtifact.abi,
      functionName: "listings",
      args: [BigInt(tokenId)]
    }),
    publicClient.readContract({
      address: config.agentMarketplaceAddress as `0x${string}`,
      abi: marketplaceArtifact.abi,
      functionName: "usagePrices",
      args: [BigInt(tokenId)]
    }),
    publicClient.readContract({
      address: config.agentMarketplaceAddress as `0x${string}`,
      abi: marketplaceArtifact.abi,
      functionName: "isListingValid",
      args: [BigInt(tokenId)]
    })
  ]);

  const owner = ownerResult as string;
  const typedInfo = agentInfo as AgentInfoResult;
  const typedListing = listing as ListingResult;
  const normalizedInfo = normalizeAgentInfo(typedInfo);
  const normalizedListing = normalizeListing(typedListing);
  const metadata = await readMetadata(normalizedInfo.metadataURI);
  const seeded = getSeededAgentDefinition(normalizedInfo.agentKey);
  const isListingValid = listingValidity as boolean;

  return {
    tokenId,
    name: metadata.name ?? seeded.fallbackName,
    description: metadata.description ?? seeded.fallbackDescription,
    category: metadata.category ?? seeded.fallbackCategory,
    image: metadata.image ?? "",
    promptHint: metadata.promptHint ?? seeded.fallbackPromptHint ?? "Enter a prompt to execute this agent once.",
    owner: getAddress(owner),
    creator: getAddress(normalizedInfo.creator),
    isListed: isListingValid,
    salePrice: isListingValid ? normalizedListing.price.toString() : "0",
    usagePrice: (usagePrice as bigint).toString(),
    usageCount: Number(normalizedInfo.usageCount),
    successCount: Number(normalizedInfo.successCount),
    failureCount: Number(normalizedInfo.failureCount),
    isActive: normalizedInfo.isActive,
    version: normalizedInfo.version,
    maintainer: getAddress(normalizedInfo.maintainer),
    agentKey: normalizedInfo.agentKey
  };
}

export async function readAgents(): Promise<AgentCard[]> {
  if (config.demoMode) {
    return Array.from(mockAgentState.values()).map((agent) => structuredClone(agent));
  }

  const tokenIds = await getTrackedTokenIds();
  const cards = await Promise.allSettled(tokenIds.map((tokenId) => readAgentCard(tokenId)));
  return cards.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
}

export async function hasValidEntitlement(params: {
  entitlementId: bigint;
  buyerAddress: string;
  tokenId: bigint;
}): Promise<boolean> {
  if (config.demoMode) {
    return true;
  }

  const result = await publicClient.readContract({
    address: config.agentMarketplaceAddress as `0x${string}`,
    abi: marketplaceArtifact.abi,
    functionName: "hasValidEntitlement",
    args: [params.entitlementId, params.buyerAddress as `0x${string}`, params.tokenId]
  });

  return result as boolean;
}

export async function finalizeUsage(entitlementId: bigint, success: boolean): Promise<`0x${string}`> {
  if (config.demoMode) {
    const tokenId = Number(entitlementId);
    const candidates = [tokenId, 1, 2, 3];
    const agent = candidates.map((candidate) => mockAgentState.get(candidate)).find(Boolean);

    if (agent) {
      agent.usageCount += 1;
      if (success) {
        agent.successCount += 1;
      } else {
        agent.failureCount += 1;
      }
    }

    return "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  }

  const hash = await walletClient.writeContract({
    address: config.agentMarketplaceAddress as `0x${string}`,
    abi: marketplaceArtifact.abi,
    functionName: "finalizeUsage",
    args: [entitlementId, success],
    account: finalizerAccount
  });

  return hash;
}

async function readMetadata(metadataUri: string): Promise<AgentMetadata> {
  if (!metadataUri) return {};

  if (metadataUri.startsWith("data:")) {
    return parseDataUriMetadata(metadataUri);
  }

  if (!metadataUri.startsWith("http://") && !metadataUri.startsWith("https://")) return {};

  try {
    const response = await fetch(metadataUri);
    if (!response.ok) return {};
    return (await response.json()) as AgentMetadata;
  } catch {
    return {};
  }
}

function parseDataUriMetadata(metadataUri: string): AgentMetadata {
  const match = metadataUri.match(/^data:application\/json(?:;charset=[^;,]+)?(;base64)?,(.*)$/i);
  if (!match) return {};

  const [, encodingFlag, payload] = match;

  try {
    const jsonText = encodingFlag ? Buffer.from(payload, "base64").toString("utf8") : decodeURIComponent(payload);
    return JSON.parse(jsonText) as AgentMetadata;
  } catch {
    return {};
  }
}

function normalizeAgentInfo(agentInfo: AgentInfoResult): NormalizedAgentInfo {
  if (Array.isArray(agentInfo)) {
    return {
      creator: agentInfo[0],
      metadataURI: agentInfo[1],
      agentKey: agentInfo[2],
      version: agentInfo[3],
      maintainer: agentInfo[4],
      usageCount: agentInfo[5],
      successCount: agentInfo[6],
      failureCount: agentInfo[7],
      isActive: agentInfo[8]
    };
  }

  return agentInfo as NormalizedAgentInfo;
}

function normalizeListing(listing: ListingResult): NormalizedListing {
  if (Array.isArray(listing)) {
    return {
      seller: listing[0],
      price: listing[1],
      active: listing[2]
    };
  }

  return listing as NormalizedListing;
}

async function getTrackedTokenIds(): Promise<number[]> {
  const configuredIds = config.agentTokenIds;

  try {
    const nextTokenIdResult = await publicClient.readContract({
      address: config.agentNftAddress as `0x${string}`,
      abi: agentNftArtifact.abi,
      functionName: "nextTokenId"
    });

    const nextTokenId = Number(nextTokenIdResult as bigint);
    const discoveredIds = Array.from({ length: Math.max(nextTokenId - 1, 0) }, (_, index) => index + 1);
    return Array.from(new Set([...configuredIds, ...discoveredIds])).sort((left, right) => left - right);
  } catch {
    return configuredIds;
  }
}

export const usageFinalizedEvent = parseAbiItem(
  "event UsageFinalized(uint256 indexed entitlementId, uint256 indexed tokenId, address indexed buyer, bool success)"
);
