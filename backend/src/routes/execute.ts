import { Router } from "express";
import { z } from "zod";

import { config } from "../config.js";
import { verifyExecuteSignature } from "../lib/signature.js";
import { executeAgent } from "../services/agents.js";
import { finalizeUsageResult } from "../services/finalizer.js";
import { hasValidEntitlement, readAgentCard } from "../services/chain.js";

const executeSchema = z.object({
  tokenId: z.coerce.bigint(),
  entitlementId: z.coerce.bigint(),
  buyerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  prompt: z.string().min(1).max(4000),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
  timestamp: z.coerce.number().int().positive()
});

export const executeRouter = Router();

executeRouter.post("/", async (req, res) => {
  const parsed = executeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid execute request.", details: parsed.error.flatten() });
    return;
  }

  const payload = parsed.data;

  try {
    if (!config.demoMode) {
      await verifyExecuteSignature({
        buyerAddress: payload.buyerAddress,
        tokenId: payload.tokenId,
        entitlementId: payload.entitlementId,
        prompt: payload.prompt,
        timestamp: payload.timestamp,
        signature: payload.signature,
        chainId: config.chainId,
        maxAgeSeconds: config.executeMessageTtlSeconds
      });
    }

    const [agent, entitlementValid] = await Promise.all([
      readAgentCard(Number(payload.tokenId)),
      hasValidEntitlement({
        entitlementId: payload.entitlementId,
        buyerAddress: payload.buyerAddress,
        tokenId: payload.tokenId
      })
    ]);

    if (!entitlementValid) {
      res.status(403).json({ error: "No valid unused entitlement for this buyer and token." });
      return;
    }

    if (!agent.isActive) {
      res.status(409).json({ error: "Agent is inactive." });
      return;
    }

    try {
      const execution = await executeAgent({
        agentKey: agent.agentKey,
        prompt: payload.prompt
      });

      const finalized = await finalizeUsageResult(payload.entitlementId, true);
      res.json({
        ok: true,
        tokenId: Number(payload.tokenId),
        entitlementId: Number(payload.entitlementId),
        output: execution.output,
        model: execution.model,
        finalized: true,
        finalizeTxHash: finalized.txHash
      });
    } catch (executionError) {
      const finalized = await finalizeUsageResult(payload.entitlementId, false);
      res.status(502).json({
        ok: false,
        tokenId: Number(payload.tokenId),
        entitlementId: Number(payload.entitlementId),
        error: executionError instanceof Error ? executionError.message : "Agent execution failed.",
        finalized: true,
        finalizeTxHash: finalized.txHash
      });
    }
  } catch (error) {
    res.status(401).json({
      error: error instanceof Error ? error.message : "Execution request verification failed."
    });
  }
});
