import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  RPC_URL: z.string().url(),
  CHAIN_ID: z.coerce.number().int().positive(),
  AGENT_NFT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  AGENT_MARKETPLACE_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  FINALIZER_PRIVATE_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  AGENT_TOKEN_IDS: z.string().default("1,2,3"),
  EXECUTE_MESSAGE_TTL_SECONDS: z.coerce.number().int().positive().default(600),
  OPENAI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini")
});

const env = envSchema.parse(process.env);

export const config = {
  port: env.PORT,
  corsOrigin: env.CORS_ORIGIN,
  rpcUrl: env.RPC_URL,
  chainId: env.CHAIN_ID,
  agentNftAddress: env.AGENT_NFT_ADDRESS,
  agentMarketplaceAddress: env.AGENT_MARKETPLACE_ADDRESS,
  finalizerPrivateKey: env.FINALIZER_PRIVATE_KEY,
  agentTokenIds: env.AGENT_TOKEN_IDS.split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0),
  executeMessageTtlSeconds: env.EXECUTE_MESSAGE_TTL_SECONDS,
  openAiBaseUrl: env.OPENAI_BASE_URL.replace(/\/$/, ""),
  openAiApiKey: env.OPENAI_API_KEY ?? "",
  openAiModel: env.OPENAI_MODEL
} as const;
