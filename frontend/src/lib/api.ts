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

const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly url?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const fallbackAgents: AgentCard[] = [
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
  },
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
  },
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
];

function cloneFallbackAgents(): AgentCard[] {
  return fallbackAgents.map((agent) => ({ ...agent }));
}

function getFallbackAgent(tokenId: number): AgentCard | undefined {
  return fallbackAgents.find((agent) => agent.tokenId === tokenId);
}

function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

export function isApiErrorStatus(value: unknown, status: number) {
  return isApiError(value) && value.status === status;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson<T>(url: string, init?: RequestInit, retries = 2): Promise<T> {
  let attempt = 0;

  while (attempt <= retries) {
    try {
      const response = await fetch(url, init);
      if (response.ok) {
        return (await response.json()) as T;
      }

      const error = new ApiError(`Request failed with status ${response.status}.`, response.status, url);
      if (!RETRYABLE_STATUSES.has(response.status) || attempt === retries) {
        throw error;
      }
    } catch (error) {
      if (attempt === retries || isApiError(error)) {
        throw error;
      }
    }

    attempt += 1;
    await sleep(250 * attempt);
  }

  throw new ApiError("Request failed.", undefined, url);
}

export async function fetchAgents(): Promise<AgentCard[]> {
  try {
    const data = await fetchJson<AgentListResponse>(`${frontendConfig.backendUrl}/agents`, { cache: "no-store" });
    return data.agents;
  } catch (error) {
    if (frontendConfig.demoMode) {
      console.warn("Falling back to demo agents because the backend is unavailable.", error);
      return cloneFallbackAgents();
    }

    throw error;
  }
}

export async function fetchAgent(tokenId: number): Promise<AgentCard> {
  try {
    const data = await fetchJson<AgentDetailResponse>(`${frontendConfig.backendUrl}/agents/${tokenId}`, {
      cache: "no-store"
    });
    return data.agent;
  } catch (error) {
    if (frontendConfig.demoMode) {
      const fallbackAgent = getFallbackAgent(tokenId);
      if (fallbackAgent) {
        console.warn(`Falling back to demo agent ${tokenId} because the backend is unavailable.`, error);
        return { ...fallbackAgent };
      }
    }

    throw error;
  }
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
