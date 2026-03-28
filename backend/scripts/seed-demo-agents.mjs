import "dotenv/config";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  createPublicClient,
  createWalletClient,
  formatEther,
  getAddress,
  http,
  parseEther
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function loadArtifact(relativePath) {
  return JSON.parse(readFileSync(resolve(process.cwd(), relativePath), "utf8"));
}

function buildMetadataUri(metadata) {
  return `data:application/json,${encodeURIComponent(JSON.stringify(metadata))}`;
}

function getAgentKey(agentInfo) {
  if (Array.isArray(agentInfo)) {
    return agentInfo[2];
  }

  return agentInfo.agentKey;
}

function getListingFields(listing) {
  if (Array.isArray(listing)) {
    return {
      seller: listing[0],
      price: listing[1],
      active: listing[2]
    };
  }

  return listing;
}

const seededAgents = [
  {
    tokenId: 1n,
    agentKey: "research-agent",
    version: "1.0.0",
    salePrice: parseEther("1"),
    usagePrice: parseEther("0.1"),
    listed: true,
    metadata: {
      name: "Research Agent",
      description: "Turns a prompt into a concise research brief.",
      category: "Research",
      image: "",
      promptHint: "Analyze the current market for AI-native commerce protocols."
    }
  },
  {
    tokenId: 2n,
    agentKey: "marketing-copy-agent",
    version: "1.0.0",
    salePrice: 0n,
    usagePrice: parseEther("0.05"),
    listed: false,
    metadata: {
      name: "Marketing Copy Agent",
      description: "Produces launch-ready marketing copy.",
      category: "Marketing",
      image: "",
      promptHint: "Write launch copy for an ownable AI agent marketplace."
    }
  },
  {
    tokenId: 3n,
    agentKey: "summarizer-agent",
    version: "1.0.0",
    salePrice: 0n,
    usagePrice: parseEther("0.025"),
    listed: false,
    metadata: {
      name: "Summarizer Agent",
      description: "Summarizes long input into key points.",
      category: "Productivity",
      image: "",
      promptHint: "Summarize the key value proposition of on-chain agent commerce."
    }
  }
];

async function main() {
  const rpcUrl = requireEnv("RPC_URL");
  const chainId = Number(requireEnv("CHAIN_ID"));
  const agentNftAddress = getAddress(requireEnv("AGENT_NFT_ADDRESS"));
  const marketplaceAddress = getAddress(requireEnv("AGENT_MARKETPLACE_ADDRESS"));
  const deployerPrivateKey = requireEnv("DEPLOYER_PRIVATE_KEY");

  const agentNftArtifact = loadArtifact("../contracts/out/AgentNFT.sol/AgentNFT.json");
  const marketplaceArtifact = loadArtifact("../contracts/out/AgentMarketplace.sol/AgentMarketplace.json");

  const account = privateKeyToAccount(deployerPrivateKey);

  const chain = {
    id: chainId,
    name: `Monad MVP ${chainId}`,
    nativeCurrency: {
      name: "Native",
      symbol: "NATIVE",
      decimals: 18
    },
    rpcUrls: {
      default: {
        http: [rpcUrl]
      }
    }
  };

  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl)
  });

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl)
  });

  console.log(`Seeding agents on chain ${chainId}`);
  console.log(`Seeder: ${account.address}`);
  console.log(`AgentNFT: ${agentNftAddress}`);
  console.log(`Marketplace: ${marketplaceAddress}`);

  const nextTokenId = await publicClient.readContract({
    address: agentNftAddress,
    abi: agentNftArtifact.abi,
    functionName: "nextTokenId"
  });

  if (nextTokenId > 4n) {
    throw new Error(
      `nextTokenId is ${nextTokenId}. This script expects token IDs 1, 2, 3 to remain reserved for seeded demo agents.`
    );
  }

  for (const seededAgent of seededAgents) {
    let exists = true;
    try {
      await publicClient.readContract({
        address: agentNftAddress,
        abi: agentNftArtifact.abi,
        functionName: "ownerOf",
        args: [seededAgent.tokenId]
      });
    } catch {
      exists = false;
    }

    if (!exists) {
      const mintHash = await walletClient.writeContract({
        address: agentNftAddress,
        abi: agentNftArtifact.abi,
        functionName: "mintAgent",
        args: [
          buildMetadataUri(seededAgent.metadata),
          seededAgent.agentKey,
          seededAgent.version,
          account.address
        ],
        account
      });
      await publicClient.waitForTransactionReceipt({ hash: mintHash });
      console.log(`Minted token ${seededAgent.tokenId} (${seededAgent.agentKey}): ${mintHash}`);
    } else {
      console.log(`Token ${seededAgent.tokenId} already exists, verifying shape.`);
    }

    const info = await publicClient.readContract({
      address: agentNftAddress,
      abi: agentNftArtifact.abi,
      functionName: "getAgentInfo",
      args: [seededAgent.tokenId]
    });

    if (getAgentKey(info) !== seededAgent.agentKey) {
      throw new Error(
        `Token ${seededAgent.tokenId} has agentKey ${getAgentKey(info)}, expected ${seededAgent.agentKey}.`
      );
    }

    const usagePrice = await publicClient.readContract({
      address: marketplaceAddress,
      abi: marketplaceArtifact.abi,
      functionName: "usagePrices",
      args: [seededAgent.tokenId]
    });

    if (usagePrice !== seededAgent.usagePrice) {
      const usageHash = await walletClient.writeContract({
        address: marketplaceAddress,
        abi: marketplaceArtifact.abi,
        functionName: "setUsagePrice",
        args: [seededAgent.tokenId, seededAgent.usagePrice],
        account
      });
      await publicClient.waitForTransactionReceipt({ hash: usageHash });
      console.log(
        `Set usage price for token ${seededAgent.tokenId} to ${formatEther(seededAgent.usagePrice)}: ${usageHash}`
      );
    }
  }

  const isApprovedForAll = await publicClient.readContract({
    address: agentNftAddress,
    abi: agentNftArtifact.abi,
    functionName: "isApprovedForAll",
    args: [account.address, marketplaceAddress]
  });

  if (!isApprovedForAll) {
    const approvalHash = await walletClient.writeContract({
      address: agentNftAddress,
      abi: agentNftArtifact.abi,
      functionName: "setApprovalForAll",
      args: [marketplaceAddress, true],
      account
    });
    await publicClient.waitForTransactionReceipt({ hash: approvalHash });
    console.log(`Granted marketplace approval for all tokens: ${approvalHash}`);
  }

  const listing = await publicClient.readContract({
    address: marketplaceAddress,
    abi: marketplaceArtifact.abi,
    functionName: "listings",
    args: [1n]
  });

  const normalizedListing = getListingFields(listing);

  if (
    !normalizedListing.active ||
    normalizedListing.price !== seededAgents[0].salePrice ||
    getAddress(normalizedListing.seller) !== account.address
  ) {
    const listHash = await walletClient.writeContract({
      address: marketplaceAddress,
      abi: marketplaceArtifact.abi,
      functionName: "listAgent",
      args: [1n, seededAgents[0].salePrice],
      account
    });
    await publicClient.waitForTransactionReceipt({ hash: listHash });
    console.log(`Listed token 1 for ${formatEther(seededAgents[0].salePrice)}: ${listHash}`);
  } else {
    console.log(`Token 1 already listed for ${formatEther(normalizedListing.price)}.`);
  }

  console.log("");
  console.log("Seeding complete.");
  console.log("Expected demo state:");
  console.log(`- Token 1 listed for sale at ${formatEther(seededAgents[0].salePrice)}`);
  console.log(`- Token 1 usage price ${formatEther(seededAgents[0].usagePrice)}`);
  console.log(`- Token 2 usage price ${formatEther(seededAgents[1].usagePrice)}`);
  console.log(`- Token 3 usage price ${formatEther(seededAgents[2].usagePrice)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
