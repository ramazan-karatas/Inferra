import cors from "cors";
import express from "express";
import type { Server } from "node:http";

import { config } from "./config.js";
import { agentsRouter } from "./routes/agents.js";
import { executeRouter } from "./routes/execute.js";

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/agents", agentsRouter);
app.use("/execute", executeRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Internal server error.";
  res.status(500).json({ error: message });
});

const server: Server = app.listen(config.port, () => {
  console.log(`Backend listening on http://localhost:${config.port}`);
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${config.port} is already in use. Stop the existing process or change PORT in backend/.env and NEXT_PUBLIC_BACKEND_URL in frontend/.env.local.`
    );
    process.exit(1);
  }

  throw error;
});
