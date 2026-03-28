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

type AgentInfoResult = readonly [
  string,
  string,
  string,
  string,
  string,
  bigint,
  bigint,
  bigint,
  boolean
];

type ListingResult = readonly [string, bigint, boolean];

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
  const [ownerResult, agentInfo, listing, usagePrice] = await Promise.all([
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
    })
  ]);

  const owner = ownerResult as string;
  const typedInfo = agentInfo as AgentInfoResult;
  const typedListing = listing as ListingResult;
  const metadata = await readMetadata(typedInfo[1]);
  const seeded = getSeededAgentDefinition(typedInfo[2]);
  const isListingValid = typedListing[2] && typedListing[0].toLowerCase() === owner.toLowerCase();

  return {
    tokenId,
    name: metadata.name ?? seeded.fallbackName,
    description: metadata.description ?? seeded.fallbackDescription,
    category: metadata.category ?? seeded.fallbackCategory,
    image: metadata.image ?? "",
    promptHint: metadata.promptHint ?? "Enter a prompt to execute this agent once.",
    owner: getAddress(owner),
    creator: getAddress(typedInfo[0]),
    isListed: isListingValid,
    salePrice: isListingValid ? typedListing[1].toString() : "0",
    usagePrice: (usagePrice as bigint).toString(),
    usageCount: Number(typedInfo[5]),
    successCount: Number(typedInfo[6]),
    failureCount: Number(typedInfo[7]),
    isActive: typedInfo[8],
    version: typedInfo[3],
    maintainer: getAddress(typedInfo[4]),
    agentKey: typedInfo[2]
  };
}

export async function readAgents(): Promise<AgentCard[]> {
  const cards = await Promise.allSettled(config.agentTokenIds.map((tokenId) => readAgentCard(tokenId)));
  return cards.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
}

export async function hasValidEntitlement(params: {
  entitlementId: bigint;
  buyerAddress: string;
  tokenId: bigint;
}): Promise<boolean> {
  const result = await publicClient.readContract({
    address: config.agentMarketplaceAddress as `0x${string}`,
    abi: marketplaceArtifact.abi,
    functionName: "hasValidEntitlement",
    args: [params.entitlementId, params.buyerAddress as `0x${string}`, params.tokenId]
  });

  return result as boolean;
}

export async function finalizeUsage(entitlementId: bigint, success: boolean): Promise<`0x${string}`> {
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
  if (!metadataUri.startsWith("http://") && !metadataUri.startsWith("https://")) return {};

  try {
    const response = await fetch(metadataUri);
    if (!response.ok) return {};
    return (await response.json()) as AgentMetadata;
  } catch {
    return {};
  }
}

export const usageFinalizedEvent = parseAbiItem(
  "event UsageFinalized(uint256 indexed entitlementId, uint256 indexed tokenId, address indexed buyer, bool success)"
);
