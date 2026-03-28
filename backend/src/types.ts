export type AgentCard = {
  tokenId: number;
  name: string;
  description: string;
  category: string;
  image: string;
  promptHint: string;
  owner: string;
  creator: string;
  isListed: boolean;
  salePrice: string;
  usagePrice: string;
  usageCount: number;
  successCount: number;
  failureCount: number;
  isActive: boolean;
  version: string;
  maintainer: string;
  agentKey: string;
};

export type ExecutionResult = {
  output: string;
  model: string;
};

export type SeededAgentDefinition = {
  fallbackName: string;
  fallbackDescription: string;
  fallbackCategory: string;
  fallbackPromptHint?: string;
  systemPrompt: string;
};

export type AgentMetadata = {
  name?: string;
  description?: string;
  category?: string;
  image?: string;
  promptHint?: string;
};
