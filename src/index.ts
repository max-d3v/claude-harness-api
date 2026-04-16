import express from "express";
import type { Request, Response } from "express";
import { queryAgent, type AgentOptions } from "./agent.js";
import { MODES } from "./modes/index.js";

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 3000;

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", runtime: "bun", functions: Object.keys(MODES) });
});

app.post("/prompt", async (req: Request, res: Response) => {
  const body = req.body as AgentOptions;
  if (!body.prompt || typeof body.prompt !== "string") {
    res.status(400).json({ error: "Missing required field: prompt" });
    return;
  }
  if (!body.project || typeof body.project !== "string") {
    res.status(400).json({ error: "Missing required field: project" });
    return;
  }
  if (!body.originBranch || typeof body.originBranch !== "string") {
    res.status(400).json({ error: "Missing required field: originBranch" });
    return;
  }

  try {
    const result = await queryAgent(body);
    res.json(result);
  } catch (err: any) {
    console.error("[POST /prompt]", err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

app.post("/mode/:name", async (req: Request, res: Response) => {
  const fn = MODES[req.params.name as keyof typeof MODES];
  if (!fn) {
    res.status(404).json({ error: `Unknown function: ${req.params.name}` });
    return;
  }

  try {
    const result = await fn(req.body);
    res.json(result);
  } catch (err: any) {
    console.error(`[POST /fn/${req.params.name}]`, err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`
  Claude Harness API — http://localhost:${PORT}
  Auth: Claude CLI OAuth | Runtime: Bun ${Bun.version}

  POST /prompt       Run agent in worktree → commit → push → PR
  POST /mode/:name   Specific mode (${Object.keys(MODES).join(", ")})
  GET  /health       Status
  `);
});