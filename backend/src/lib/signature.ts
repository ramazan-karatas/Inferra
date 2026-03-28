import { recoverMessageAddress } from "viem";

type ExecuteSignaturePayload = {
  buyerAddress: string;
  tokenId: bigint;
  entitlementId: bigint;
  prompt: string;
  timestamp: number;
  chainId: number;
};

export function buildExecuteMessage(payload: ExecuteSignaturePayload): string {
  return [
    "Monad Agent Execution Request",
    `buyerAddress:${payload.buyerAddress.toLowerCase()}`,
    `tokenId:${payload.tokenId.toString()}`,
    `entitlementId:${payload.entitlementId.toString()}`,
    `prompt:${payload.prompt}`,
    `timestamp:${payload.timestamp}`,
    `chainId:${payload.chainId}`
  ].join("\n");
}

export async function verifyExecuteSignature(params: {
  buyerAddress: string;
  tokenId: bigint;
  entitlementId: bigint;
  prompt: string;
  timestamp: number;
  signature: string;
  chainId: number;
  maxAgeSeconds: number;
}): Promise<void> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - params.timestamp) > params.maxAgeSeconds) {
    throw new Error("Execution request timestamp is stale.");
  }

  const message = buildExecuteMessage({
    buyerAddress: params.buyerAddress,
    tokenId: params.tokenId,
    entitlementId: params.entitlementId,
    prompt: params.prompt,
    timestamp: params.timestamp,
    chainId: params.chainId
  });

  const recovered = await recoverMessageAddress({
    message,
    signature: params.signature as `0x${string}`
  });

  if (recovered.toLowerCase() !== params.buyerAddress.toLowerCase()) {
    throw new Error("Invalid execution request signature.");
  }
}
