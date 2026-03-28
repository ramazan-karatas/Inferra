import "dotenv/config";

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
  isAddress,
  zeroAddress
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function optionalEnv(name) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function requirePrivateKey(name) {
  return parsePrivateKey(name, requireEnv(name));
}

function parsePrivateKey(name, value) {
  if (!/^0x[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error(`${name} must be a 32-byte hex private key with 0x prefix.`);
  }

  return value;
}

function requireAddress(name, value) {
  if (!isAddress(value)) {
    throw new Error(`${name} must be a valid EVM address.`);
  }

  return getAddress(value);
}

function loadArtifact(relativePath) {
  const artifactPath = resolve(process.cwd(), relativePath);
  const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));

  if (!artifact.bytecode?.object?.startsWith("0x")) {
    throw new Error(`Artifact at ${artifactPath} does not include deployable bytecode.`);
  }

  return artifact;
}

async function main() {
  const rpcUrl = optionalEnv("DEPLOY_RPC_URL") ?? requireEnv("RPC_URL");
  const deployerPrivateKey = requirePrivateKey("DEPLOYER_PRIVATE_KEY");
  const finalizerPrivateKey = parsePrivateKey(
    "FINALIZER_PRIVATE_KEY",
    optionalEnv("FINALIZER_PRIVATE_KEY") ?? deployerPrivateKey
  );
  const tokenName = optionalEnv("AGENT_NFT_NAME") ?? "Monad Agents";
  const tokenSymbol = optionalEnv("AGENT_NFT_SYMBOL") ?? "AGENT";

  const agentNftArtifact = loadArtifact("../contracts/out/AgentNFT.sol/AgentNFT.json");
  const marketplaceArtifact = loadArtifact(
    "../contracts/out/AgentMarketplace.sol/AgentMarketplace.json"
  );

  const deployer = privateKeyToAccount(deployerPrivateKey);
  const finalizer = privateKeyToAccount(finalizerPrivateKey);

  const publicClient = createPublicClient({
    transport: http(rpcUrl)
  });

  const chainId = await publicClient.getChainId();

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

  const walletClient = createWalletClient({
    account: deployer,
    chain,
    transport: http(rpcUrl)
  });

  console.log(`Deploying to chain ${chainId} via ${rpcUrl}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Finalizer: ${finalizer.address}`);

  const deployerBalance = await publicClient.getBalance({ address: deployer.address });
  if (deployerBalance === 0n) {
    throw new Error(`Deployer ${deployer.address} has zero balance on chain ${chainId}.`);
  }

  const nftDeployHash = await walletClient.deployContract({
    abi: agentNftArtifact.abi,
    bytecode: agentNftArtifact.bytecode.object,
    args: [tokenName, tokenSymbol],
    account: deployer
  });
  console.log(`AgentNFT deployment tx: ${nftDeployHash}`);

  const nftReceipt = await publicClient.waitForTransactionReceipt({ hash: nftDeployHash });
  const agentNftAddress = requireAddress(
    "AgentNFT deployment result",
    nftReceipt.contractAddress ?? zeroAddress
  );
  console.log(`AgentNFT deployed at ${agentNftAddress}`);

  const marketplaceDeployHash = await walletClient.deployContract({
    abi: marketplaceArtifact.abi,
    bytecode: marketplaceArtifact.bytecode.object,
    args: [agentNftAddress],
    account: deployer
  });
  console.log(`AgentMarketplace deployment tx: ${marketplaceDeployHash}`);

  const marketplaceReceipt = await publicClient.waitForTransactionReceipt({
    hash: marketplaceDeployHash
  });
  const agentMarketplaceAddress = requireAddress(
    "AgentMarketplace deployment result",
    marketplaceReceipt.contractAddress ?? zeroAddress
  );
  console.log(`AgentMarketplace deployed at ${agentMarketplaceAddress}`);

  const recorderTx = await walletClient.writeContract({
    address: agentNftAddress,
    abi: agentNftArtifact.abi,
    functionName: "setAuthorizedUsageRecorder",
    args: [agentMarketplaceAddress],
    account: deployer
  });
  await publicClient.waitForTransactionReceipt({ hash: recorderTx });
  console.log(`Authorized usage recorder set: ${recorderTx}`);

  const finalizerTx = await walletClient.writeContract({
    address: agentMarketplaceAddress,
    abi: marketplaceArtifact.abi,
    functionName: "setFinalizer",
    args: [finalizer.address],
    account: deployer
  });
  await publicClient.waitForTransactionReceipt({ hash: finalizerTx });
  console.log(`Marketplace finalizer set: ${finalizerTx}`);

  const [authorizedUsageRecorder, marketplaceFinalizer, contractOwner] = await Promise.all([
    publicClient.readContract({
      address: agentNftAddress,
      abi: agentNftArtifact.abi,
      functionName: "authorizedUsageRecorder"
    }),
    publicClient.readContract({
      address: agentMarketplaceAddress,
      abi: marketplaceArtifact.abi,
      functionName: "finalizer"
    }),
    publicClient.readContract({
      address: agentMarketplaceAddress,
      abi: marketplaceArtifact.abi,
      functionName: "owner"
    })
  ]);

  const deployment = {
    chainId,
    rpcUrl,
    deployerAddress: deployer.address,
    finalizerAddress: finalizer.address,
    agentNftAddress,
    agentMarketplaceAddress,
    authorizedUsageRecorder: getAddress(authorizedUsageRecorder),
    marketplaceFinalizer: getAddress(marketplaceFinalizer),
    marketplaceOwner: getAddress(contractOwner),
    tokenName,
    tokenSymbol,
    deployedAt: new Date().toISOString()
  };

  const deploymentsDir = resolve(process.cwd(), "../contracts/deployments");
  mkdirSync(deploymentsDir, { recursive: true });

  const latestPath = resolve(deploymentsDir, "latest.json");
  const chainPath = resolve(deploymentsDir, `${chainId}.json`);

  writeFileSync(latestPath, `${JSON.stringify(deployment, null, 2)}\n`);
  writeFileSync(chainPath, `${JSON.stringify(deployment, null, 2)}\n`);

  console.log("");
  console.log("Deployment saved:");
  console.log(latestPath);
  console.log(chainPath);
  console.log("");
  console.log("Backend .env values:");
  console.log(`RPC_URL=${rpcUrl}`);
  console.log(`CHAIN_ID=${chainId}`);
  console.log(`AGENT_NFT_ADDRESS=${agentNftAddress}`);
  console.log(`AGENT_MARKETPLACE_ADDRESS=${agentMarketplaceAddress}`);
  console.log(`FINALIZER_PRIVATE_KEY=${finalizerPrivateKey}`);
  console.log("");
  console.log("Frontend .env.local values:");
  console.log(`NEXT_PUBLIC_RPC_URL=${rpcUrl}`);
  console.log(`NEXT_PUBLIC_CHAIN_ID=${chainId}`);
  console.log(`NEXT_PUBLIC_AGENT_NFT_ADDRESS=${agentNftAddress}`);
  console.log(`NEXT_PUBLIC_AGENT_MARKETPLACE_ADDRESS=${agentMarketplaceAddress}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
