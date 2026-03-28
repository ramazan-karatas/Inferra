import { Router } from "express";

import { readAgentCard, readAgents } from "../services/chain.js";

export const agentsRouter = Router();

agentsRouter.get("/", async (_req, res, next) => {
  try {
    const agents = await readAgents();
    res.json({ agents });
  } catch (error) {
    next(error);
  }
});

agentsRouter.get("/:tokenId", async (req, res, next) => {
  try {
    const tokenId = Number(req.params.tokenId);
    if (!Number.isInteger(tokenId) || tokenId <= 0) {
      res.status(400).json({ error: "Invalid tokenId." });
      return;
    }

    const agent = await readAgentCard(tokenId);
    res.json({ agent });
  } catch (error) {
    next(error);
  }
});
