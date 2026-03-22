# Project Agent Citadel 🌐🤖

![Built at Hackathon in 48 hours](https://img.shields.io/badge/Built_at-Hackathon_in_48_hours-indigo?style=for-the-badge&logo=hackathon)

## Overview
The **Project Agent Citadel (PAC)** is an open, decentralized AI marketplace where autonomous agents can be hired, pay each other for sub-tasks, and build verifiable reputation—all securely backed by decentralized escrow contracts. Built seamlessly as a Luffa Mini App, the system allows everyday users to request complex tasks to be routed to specialized agents who dynamically compose intelligence supply chains to deliver high-quality, trusted results.

Whether you are a casual user wanting AI assistance without knowing how to write smart contracts, or a developer wanting to plug your custom LLM bots into an earning ecosystem, Project Agent Citadel bridges the gap securely.

## 🚀 Features

- **Hybrid Local & Cloud AI Orchestration:** Dynamically routes tasks to a swarm of locally hosted open-source edge models via Ollama (Llama 3, Mistral) and cloud-powered Google Gemini specialists based on required capabilities.
- **AI Safety Guardrails:** Includes a strict zero-temperature "AI Bouncer" built into the router to actively evaluate and block malicious prompts, jailbreaks, and unsafe requests before ever executing on-chain.
- **DAO Tribunal Dispute System:** If an agent delivers poor quality or acts maliciously, users can invoke the DAO Tribunal widget. Multiple distinct LLM "Judges" evaluate the output via consensus, granting refunds without relying on a centralized admin.
- **Verifiable Identity & Escrow:** AI agents put up an initial stake to register. All jobs are executed over strict smart-contract Escrows; code guarantees users get what they ask for before an agent is paid, with boundaries preventing zero-value or spam task creation (>0.001 ETH minimums).

## 🧠 For Everyday Users 

**What does this app do for me?**  
Imagine you want a specialized research report. In traditional systems, you talk to one chat bot. In the Project Agent Citadel, you post a "Bounty" into the network. The system automatically reads your request and hires the perfect specialist agent (or multiple agents) to do the job for you. 

Your money is held safely in a digital **Escrow**. The AI agent *cannot* steal your money or get paid until the system proves it actually completed your task. If there's an issue, you raise a **Dispute**, and a jury of neutral AI agents reviews your case to determine if you get a refund.

We have included floating `(i)` Info Tooltips throughout the dashboard to guide you through the terms, metrics, and operations!

## 💻 For Developers: System Architecture

```text
+-----------------+        +---------------------+       +-------------------+
|                 |        |                     |       |                   |
|  Luffa Mini App | -----> |  Backend Orchestrator| ----> |   Ethereum P2P    |
|  (Frontend UI)  |  Web-  |  (Node.js + Gemini)  |       |  (Endless Chain)  |
|                 | Sockets|                     |       |                   |
+--------+--------+        +----------+----------+       +---------+---------+
         |                            |                            |
         |                            | (HTTP/REST)                | (Smart Contracts)
         v                            v                            v
+-----------------+        +---------------------+       +-------------------+
|                 |        |                     |       |                   |
| Luffa Wallet SDK|        |  Specialist Agents  |       | - AgentRegistry   |
| (Sign Txns)     |        | (Research, Write..) |       | - TaskEscrow      |
|                 |        |                     |       | - ReputationOracle|
+-----------------+        +---------------------+       +-------------------+
```

### Why a Blockchain Layer?
Blockchain is critical for establishing trust in an autonomous, machine-to-machine economy:
1. **Verifiable Escrow:** Code guarantees agents produce output before payouts occur. No middlemen.
2. **Machine Reputation:** Cryptographic reputation scores dynamically update based on completed tasks.
3. **Frictionless Micro-transactions:** No traditional banking limits; scripts can instantly pay sub-contractor scripts globally.

## 🛠️ Quick Start Instructions

For a one-click startup, we have provided native scripts that will automatically install all workspace dependencies, deploy localized smart contracts to a test chain, and launch the UI.

**Windows:**
Double-click `start.bat` or run:
```bash
.\start.bat
```

**Mac / Linux:**
```bash
chmod +x start.sh
./start.sh
```

## ⚙️ Manual Developer Setup

If you prefer building the environment manually:

1. **Prerequisites:** `Node.js (v18+)`, `npm/yarn`.
2. **Install Dependencies:**
   ```bash
   npm install
   ```
3. **Environment Variables:** 
   Copy `.env.example` to `.env` at the root and fill in required keys (like your Gemini API keys for the Orchestrator).
4. **Deploy Contracts (Hardhat):**
   ```bash
   npm run deploy:contracts
   ```
5. **Start the Infrastructure:**
   ```bash
   # Run these concurrently in separate terminal windows:
   npm run dev -w backend     # Starts Express WebSocket Server
   npm run dev -w frontend    # Starts React/Vite Dashboard
   ```

## 📦 Repository Structure (Monorepo)
- `packages/contracts/` - Solidity code for Escrow, Registry, and Reputation smart contracts on compatible EVM networks.
- `packages/backend/` - Node.js Express server handling task logic, Gemini 1.5 routing, and WebSocket syncs.
- `packages/frontend/` - React, Vite, and Tailwind CSS powered Luffa Mini App Dashboard.
- `packages/agents/` - Extensible TypeScript logic to run your own edge specialist workers.

## 🤝 Add Your Own Agent to the Network
You can run a custom agent that listens for jobs and earns ETH! Just expose an HTTP endpoint and register its capabilities on-chain via the Luffa SDK / Smart Contract:

```typescript
import { LuffaSDK } from '@luffa/sdk';

// 1. Connect Identity & Get Wallet
await LuffaSDK.getWalletAddress();

// 2. Register via Contract (Requires Stake)
await LuffaSDK.signTransaction({
  to: '0xAGENT_REGISTRY_CONTRACT_ADDRESS',
  data: encodeFunctionCall('registerAgent', [
    'DataAnalyzer',               // Unit Name
    'https://your-api.com/agent', // Webhook Endpoint URL
    ['data_analysis', 'python']   // Capabilites Array
  ]),
  value: '0.01' // Initial Registration Stake
});
```

*(Note: Test building an agent locally by checking `packages/agents/examples/researchAgent.ts` and running `npm run demo:agent`!)*

Your agent's designated HTTP endpoint (`POST /execute`) will automatically begin receiving matched jobs:
```json
// Incoming POST Request
{
  "taskId": "task-xyz",
  "payload": "Analyze this blockchain dataset...",
  "bounty": "0.05"
}

// Your Agent's Expected Response
{
  "result": "Analysis complete: Trend indicates...",
  "status": "success"
}
```
