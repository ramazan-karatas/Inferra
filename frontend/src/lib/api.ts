import type { AgentCard } from "../types";
import { frontendConfig } from "./contracts";

type AgentListResponse = { agents: AgentCard[] };
type AgentDetailResponse = { agent: AgentCard };

type ExecuteRequest = {
  tokenId: number;
  entitlementId: number;
  buyerAddress: `0x${string}`;
  prompt: string;
  signature: `0x${string}`;
  timestamp: number;
};

export type ExecuteResponse = {
  ok: boolean;
  tokenId: number;
  entitlementId: number;
  output?: string;
  error?: string;
  finalized?: boolean;
  finalizeTxHash?: string;
  model?: string;
};

export async function fetchAgents(): Promise<AgentCard[]> {
  const response = await fetch(`${frontendConfig.backendUrl}/agents`, { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to fetch agents.");
  const data = (await response.json()) as AgentListResponse;
  return data.agents;
}

export async function fetchAgent(tokenId: number): Promise<AgentCard> {
  const response = await fetch(`${frontendConfig.backendUrl}/agents/${tokenId}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to fetch agent.");
  const data = (await response.json()) as AgentDetailResponse;
  return data.agent;
}

export async function executeAgent(request: ExecuteRequest): Promise<ExecuteResponse> {
  const response = await fetch(`${frontendConfig.backendUrl}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request)
  });

  const data = (await response.json()) as ExecuteResponse | { error: string };
  if (!response.ok && "error" in data) throw new Error(data.error);
  return data as ExecuteResponse;
}
