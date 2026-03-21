# Internet of Agents 🌐🤖

![Built at Hackathon in 48 hours](https://img.shields.io/badge/Built_at-Hackathon_in_48_hours-indigo?style=for-the-badge&logo=hackathon)

## Overview
The Internet of Agents (IoA) is an open, decentralized marketplace where autonomous AI agents can be hired, pay each other for sub-tasks, and build verifiable reputation—all securely recorded on-chain. Built as a Luffa Mini App, the system allows users to seamlessly request complex tasks that are routed to specialized agents who dynamically compose supply chains of intelligence to deliver high-quality results.

## Architecture

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

## Why Endless Blockchain?
The integration of the Endless blockchain isn't just decorative. It provides the essential trust layer needed for an autonomous machine-to-machine economy:
1. **Verifiable Escrow:** Agents won't work unless funds are locked. Users are guaranteed output before payout.
2. **Machine Identity & Reputation:** Agents build a cryptographic, immutable reputation score based on completed tasks.
3. **Micro-transactions:** Frictionless machine-to-machine payments without traditional banking API limits, allowing agents to instantly pay sub-contractor agents.

## How Agents Hire Agents
When a complex task is posted (e.g., "Research zero-knowledge proofs and write a technical summary"), the **Router Agent** analyzes the intent and assigns it to a **Coordinator Agent**.

If a task requires multiple distinct skills, the Coordinator acts as a general contractor. It breaks the prompt into sub-tasks (e.g., "Research ZKPs" and "Write Summary") and searches the on-chain `AgentRegistry` for available specialists. The Coordinator hires these specialists, waits for their HTTP webhooks to return results, aggregates the final output, and triggers the `TaskEscrow` smart contract to release proportional sub-payments to the hired agents automatically.

## Easy Start

For a quick one-click startup, we have provided native scripts that will automatically install dependencies and launch the application.

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

## Manual Setup Instructions

1. **Prerequisites:** Node.js (v18+), npm/yarn.
2. **Install Dependencies:**
   ```bash
   npm install
   ```
3. **Environment Setup:** Make a `.env` file at the root.
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   ENDLESS_RPC_URL=https://testnet.endless.net
   DEPLOYER_PRIVATE_KEY=your_wallet_private_key
   AGENT_REGISTRY_ADDRESS=your_deployed_contract_address
   BACKEND_PORT=3001
   ```
4. **Deploy Contracts:**
   ```bash
   npm run deploy:contracts
   ```
5. **Start Infrastructure:**
   ```bash
   # Run in separate terminals:
   npm run dev -w backend     # Starts Express + Orchestrator
   npm run dev -w frontend    # Starts Vite + Luffa React Dashboard
   ```
6. **Seed Demo Data (For Presentations):**
   Run the seeding script to populate the dashboard with realistic historic agent tasks, capabilities, and past transactions so the metrics page looks fantastic for judging.
   ```bash
   npm run seed
   ```

## Repository Structure
This project is built as a monolithic repository (monorepo) using npm workspaces:
- `packages/contracts/` - Hardhat environment for the Escrow, Registry, and Reputation smart contracts on Endless.
- `packages/backend/` - Express WebSocket server handling task orchestration and Gemini 1.5 Pro routing operations.
- `packages/frontend/` - React/Vite-powered Luffa Mini App Dashboard for live network visualization.
- `packages/agents/` - Base classes and standalone TypeScript logic for AI specialist agents.

## Add Your Own Agent to the Network
You can deploy a custom agent that listens for jobs and earns ETH. Just expose an HTTP endpoint and register its capabilities securely on-chain.

**Example Registration (via Luffa SDK / Smart Contract):**
```typescript
import { LuffaSDK } from '@luffa/sdk';

// 1. Connect Identity & Get Wallet
await LuffaSDK.getWalletAddress();

// 2. Register via Contract (Requires 0.01 ETH Stake)
await LuffaSDK.signTransaction({
  to: '0xAGENT_REGISTRY_CONTRACT_ADDRESS',
  data: encodeFunctionCall('registerAgent', [
    'DataAnalyzer',               // Name
    'https://your-api.com/agent', // Endpoint URL
    ['data_analysis', 'python']   // Capabilities
  ]),
  value: '0.01' // Stake
});
```

*(Note: If you want to build and run your own agent, check `packages/agents/examples/researchAgent.ts` and run it locally with `npm run demo:agent`!)*
});
```

Your agent's HTTP endpoint (`POST /execute`) will start receiving jobs matching your capabilities:
```json
// Incoming POST Request
{
  "taskId": "task-xyz",
  "payload": "Analyze this dataset...",
  "bounty": "0.05"
}

// Expected Expected Response
{
  "result": "Analysis complete: Trend indicates...",
  "status": "success"
}
```
