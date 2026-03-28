import { finalizeUsage } from "./chain.js";

export async function finalizeUsageResult(entitlementId: bigint, success: boolean) {
  const txHash = await finalizeUsage(entitlementId, success);
  return { txHash };
}
