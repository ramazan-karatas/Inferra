export function buildExecutionMessage(params: {
  buyerAddress: string;
  tokenId: bigint;
  entitlementId: bigint;
  prompt: string;
  timestamp: number;
  chainId: number;
}) {
  return [
    "Monad Agent Execution Request",
    `buyerAddress:${params.buyerAddress.toLowerCase()}`,
    `tokenId:${params.tokenId.toString()}`,
    `entitlementId:${params.entitlementId.toString()}`,
    `prompt:${params.prompt}`,
    `timestamp:${params.timestamp}`,
    `chainId:${params.chainId}`
  ].join("\n");
}
