import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
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

// Load .env from root of monorepo
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const eventEmitter = new EventEmitter();
const router = new RouterAgent();
const luffaWorker = new LuffaWorkerAgent();

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
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  });
};

// --- Luffa Bot Execution Endpoints ---
app.post("/api/luffa/:uid/execute", async (req, res) => {
  const { uid } = req.params;
  const { taskId, description } = req.body;
  
  const botConfig = LUFFA_BOTS.find(b => b.uid === uid);
  if (!botConfig) return res.status(404).json({ error: "Luffa Bot not found" });

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
  tasksDb[payload.taskId] = { id: payload.taskId, description: payload.description, bounty: payload.bounty, status: "open", createdAt: Date.now() };
  broadcast("task:posted", { task: tasksDb[payload.taskId] });
});

eventEmitter.on("task:assigned", (payload) => {
  if (tasksDb[payload.taskId]) {
    tasksDb[payload.taskId].status = "assigned";
    tasksDb[payload.taskId].assignedAgent = payload.agentName;
  }
  broadcast("task:assigned", payload);
});

eventEmitter.on("task:completed", (payload) => {
  if (tasksDb[payload.taskId]) {
    tasksDb[payload.taskId].status = "completed";
    tasksDb[payload.taskId].result = payload.result;
  }
  broadcast("task:completed", payload);
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
    tasksDb[taskId] = { id: taskId, description, bounty: budgetEth, status: "open", createdAt: Date.now() };
    
    // Kick off orchestration asynchronously
    orchestrator.handleNewTask(taskId, description, budgetEth);
    
    res.json({ taskId, message: "Task posted and orchestrator started" });
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

app.get("/api/stats", async (req, res) => {
  if (!blockchain) return res.status(503).json({ error: "Blockchain not connected" });
  try {
    const stats = await blockchain.getNetworkStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/activity", (req, res) => {
  res.json(activityLog);
});

// Since standard agents register dynamically with stake in the contract directly,
// this endpoint serves as a helper/proxy if the backend needs to seed demo agents.
app.post("/api/agents/register", async (req, res) => {
  res.status(501).json({ error: "Direct registration via backend proxy requires private key. Agents should register self via smart contract directly." });
});

const PORT = process.env.BACKEND_PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Backend API & WebSocket Server running on port ${PORT}`);
});
