import express from "express";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import axios from "axios";
import { EventEmitter } from "events";
import { BlockchainService } from "./services/blockchain";
import { RouterAgent } from "./agents/router";
import { LuffaWorkerAgent } from "./agents/luffaWorker";
import { LUFFA_BOTS } from "./services/luffabot";
import { Orchestrator } from "./orchestrator";
import * as dotenv from "dotenv";
import * as path from "path";
import crypto from "crypto";

// Load .env from root of monorepo
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// Automatically assign a secure JWT_SECRET if one isn't provided or if it's using a mock value
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'mock-secret') {
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  console.log('NOTICE: Automatically generated a temporary secure JWT_SECRET for this session.');
}

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const eventEmitter = new EventEmitter();
const router = new RouterAgent();
const luffaWorker = new LuffaWorkerAgent(eventEmitter);

// Boot Phase: Environment Validation
const recommendedEnvVars = ["ENDLESS_RPC_URL", "DEPLOYER_PRIVATE_KEY", "GEMINI_API_KEY"];
const missingRecommended = recommendedEnvVars.filter(v => !process.env[v]);
if (missingRecommended.length > 0) {
  console.warn(`\n[BOOT WARNING] Missing optional environment variables:\n - ${missingRecommended.join("\n - ")}\n`);
  console.warn("Continuing with local defaults/fallbacks where possible.\n");
}

// Only initialize if we have the RPC URL configured, otherwise provide a mock or handle the error
let blockchain: BlockchainService | null = null;
let orchestrator: Orchestrator | null = null;

try {
  blockchain = new BlockchainService(eventEmitter);
  orchestrator = new Orchestrator(blockchain, router, eventEmitter);
  console.log("Blockchain Service & Orchestrator Initialized");
} catch (e: any) {
  console.warn("Failed to initialize BlockchainService (ensure Endless network is running):", e.message);
}

// In-Memory state for live feed and extended DB details
const activityLog: any[] = [];
const tasksDb: Record<string, any> = {};
const agentStatusCache: Record<string, "active" | "offline" | "busy"> = {};
/** Prevents duplicate orchestrator runs when both API and chain emit `task:posted`. */
const orchestratorStartedForTask = new Set<string>();

// Agent Health Polling Loop
const pollAgentHealth = async () => {
  if (!blockchain) return;
  try {
    const agents = await blockchain.getAllAgents();
    for (const agent of agents) {
      try {
        const res = await axios.get(`${agent.endpoint}/health`, { timeout: 3000 });
        agentStatusCache[agent.address] = res.data.status || "active";
      } catch (e) {
        agentStatusCache[agent.address] = "offline";
      }
    }
    broadcast("agents:health_update", agentStatusCache);
  } catch (error) {
    console.warn("Failed to poll agent health:", error);
  }
};
// Poll every 60 seconds
setInterval(pollAgentHealth, 60000);
// Initial poll 5 seconds after startup
setTimeout(pollAgentHealth, 5000);

// Listen to internal events and broadcast to all connected WebSocket clients
const broadcast = (type: string, payload: any) => {
  const message = JSON.stringify({ type, ...payload });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

wss.on("connection", (ws) => {
  try {
    const events = activityLog.slice(0, 30);
    ws.send(JSON.stringify({ type: "history", events }));
  } catch (e) {
    console.warn("[WS] Failed to send history:", e);
  }
});

setInterval(() => {
  const msg = JSON.stringify({ type: "ping", t: Date.now() });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}, 30000);

// --- Luffa Bot Execution Endpoints ---
// Error handling wrapped bot registration
app.post("/api/agents/register", (req, res) => {
  try {
    const { uid, secret, name, capabilities } = req.body;
    
    // Validate required types and shape
    if (!uid || typeof uid !== 'string' || !secret || typeof secret !== 'string' || !name || typeof name !== 'string') {
      return res.status(400).json({ error: "Missing or invalid required fields (uid, secret, name must be strings)." });
    }

    if (capabilities && !Array.isArray(capabilities)) {
      return res.status(400).json({ error: "Capabilities must be an array of strings." });
    }

    const existingIndex = LUFFA_BOTS.findIndex(b => b.uid === uid);
    const newConfig = {
      uid,
      secret,
      name,
      capabilities: capabilities || ["general"]
    };

    if (existingIndex >= 0) {
      LUFFA_BOTS[existingIndex] = newConfig;
    } else {
      LUFFA_BOTS.push(newConfig);
    }

    console.log(`[Agent Endpoint] Registered Custom UI Bot: ${name} (${uid})`);
    res.json({ success: true, agent: newConfig });
  } catch (error: any) {
    console.error("[Agent Endpoint] Registration Error:", error.message);
    res.status(500).json({ error: "Internal server error during agent registration." });
  }
});

app.post("/api/luffa/:uid/execute", async (req, res) => {
  const { uid } = req.params;
  const { taskId, description } = req.body;
  
  let botConfig = LUFFA_BOTS.find(b => b.uid === uid);
  
  // Provide a generic fallback for frontend-registered agents
  if (!botConfig) {
    if (true) { // Automatically accept dynamically registered frontend bots
      botConfig = {
        uid,
        secret: "dev",
        name: `Dynamic Agent ${uid}`,
        capabilities: ["general", "chat"]
      };
    } else {
      return res.status(404).json({ error: "Luffa Bot not found" });
    }
  }

  try {
    const result = await luffaWorker.executeTask(botConfig, taskId, description);
    res.json({ result });
  } catch (error: any) {
    console.error(`[LuffaWorker Failed] ${uid}:`, error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/luffa/:uid/health", (req, res) => {
  res.json({ status: "active" });
});

eventEmitter.on("activity", (payload) => {
  const entry = { timestamp: Date.now(), ...payload };
  activityLog.unshift(entry);
  if (activityLog.length > 50) activityLog.pop();
  broadcast("activity", entry);
});

eventEmitter.on("task:posted", (payload) => {
  if (!tasksDb[payload.taskId]) {
    tasksDb[payload.taskId] = { id: payload.taskId, description: payload.description, bounty: payload.bounty, status: "open", createdAt: Date.now() };
  }
  broadcast("task:posted", { task: tasksDb[payload.taskId] });

  if (orchestrator && !orchestratorStartedForTask.has(payload.taskId)) {
    orchestratorStartedForTask.add(payload.taskId);
    orchestrator
      .handleNewTask(payload.taskId, payload.description, payload.bounty)
      .catch((e) => console.error("Orchestrator failed:", e));
  }
});

eventEmitter.on("task:assigned", (payload: any) => {
  if (tasksDb[payload.taskId]) {
    tasksDb[payload.taskId].status = "assigned";
    if (payload.agentAddress) {
      tasksDb[payload.taskId].assignedAgent = payload.agentAddress;
    }
    if (payload.agentName) {
      tasksDb[payload.taskId].assignedAgentName = payload.agentName;
    }
  }
  broadcast("task:assigned", { ...payload, task: tasksDb[payload.taskId] });
});

eventEmitter.on("task:completed", (payload) => {
  if (tasksDb[payload.taskId]) {
    tasksDb[payload.taskId].status = "completed";
    tasksDb[payload.taskId].result = payload.result;
  }
  broadcast("task:completed", payload);
});

eventEmitter.on("agent:registered", (payload) => {
  broadcast("agent:registered", payload);
  eventEmitter.emit("activity", { type: "system", message: `New Agent Registered: ${payload.name}` });
});

eventEmitter.on("payment:sent", (payload) => broadcast("payment:sent", payload));

// --- REST Endpoints ---

app.get("/api/agents", async (req, res) => {
  if (!blockchain) return res.status(503).json({ error: "Blockchain not connected" });
  try {
    const agents = await blockchain.getAllAgents();
    const enrichedAgents = agents.map(a => ({ 
      ...a, 
      currentStatus: agentStatusCache[a.address] || "unknown" 
    }));
    res.json(enrichedAgents);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/tasks", async (req, res) => {
  if (!blockchain) return res.status(503).json({ error: "Blockchain not connected" });
  try {
    const onChainTasks = await blockchain.getOpenTasks();
    const { status } = req.query;
    
    let allTasks = Object.values(tasksDb);
    for (const bt of onChainTasks) {
      if (!tasksDb[bt.id]) tasksDb[bt.id] = bt;
    }
    
    if (status === "open") {
      allTasks = Object.values(tasksDb).filter(t => t.status === "open");
    } else {
      allTasks = Object.values(tasksDb);
    }
    res.json(allTasks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/tasks", async (req, res) => {
  if (!blockchain || !orchestrator) return res.status(503).json({ error: "Blockchain not connected" });
  const { description, budgetEth } = req.body;
  
  try {
    const taskId = await blockchain.postTask(description, budgetEth);
    // Ensures orchestrator runs even when ENABLE_CHAIN_EVENTS is false (no WS subscription).
    eventEmitter.emit("task:posted", { taskId, description, bounty: budgetEth });

    res.json({
      taskId,
      message: "Task posted to chain. Orchestrator started (or deduped if chain events also fired).",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const task = tasksDb[id];
  if (!task) return res.status(404).json({ error: "Task not found" });
  
  const reasoningTrace = router.getRecentDecisions().find(d => d.taskId === id);
  res.json({ ...task, routingDecision: reasoningTrace });
});

import { AGENT_REGISTRY_ADDRESS, TASK_ESCROW_ADDRESS } from "./config/contracts";

app.get("/api/config", (req, res) => {
  res.json({
    AGENT_REGISTRY_ADDRESS,
    TASK_ESCROW_ADDRESS
  });
});

app.get("/api/stats", async (req, res) => {
  if (!blockchain) return res.status(503).json({ error: "Blockchain not connected" });
  try {
    const stats = await blockchain.getNetworkStats();
    
    // Supplement blockchain state with active memory metrics for greater fidelity
    const dbTasks = Object.values(tasksDb);
    const volume = dbTasks.reduce((acc, t: any) => acc + parseFloat(t.bounty || 0), 0);
    const activeTasks = dbTasks.filter((t: any) => ["open", "assigned"].includes(t.status)).length;
    const completedTasks = dbTasks.filter((t: any) => t.status === "completed").length;
    
    res.json({ 
      ...stats, 
      activeTasks: stats.activeTasks + activeTasks, // Combine mock seed data logic
      completedTasks: stats.completedTasks + completedTasks,
      totalVolume: volume.toFixed(3) 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/activity", (req, res) => {
  res.json(activityLog);
});

// Since standard agents register dynamically with stake in the contract directly,
// this endpoint serves as a helper/proxy if the backend needs to seed demo agents.


const PORT = process.env.BACKEND_PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Backend API & WebSocket Server running on port ${PORT}`);
});
