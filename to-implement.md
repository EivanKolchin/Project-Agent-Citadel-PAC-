# To Implement — Internet of Agents

Backlog of **remaining** work. Items that were implemented in the latest pass are listed under **Recently completed** at the bottom.

---

## Still to implement

### 1. `POST /api/agents/register` (501)

- Still returns **501** — by design until a safe pattern exists (user keys vs backend custody).
- **Implement:** Document-only, or a signed flow / wallet-connect proxy that never stores user keys on the server. Out of scope for current demo.

### 2. TaskEscrow **Disputed** / **Failed** flows

- Enum exists in Solidity; **no dispute APIs or UI**.
- **Implement:** Contract methods + backend + UI, or explicitly mark as out of scope in docs. (Currently out of scope).

### 3. `packages/agents` DX

- `demo:agent` / examples exist but are light on docs.
- **Implement:** Expand README for running example agents against local chain + registry.

### 4. Production hardening

- Default dev keys, open CORS, public `/api/faucet`, no rate limits.
- **Implement:** Config profiles (`NODE_ENV`), auth for sensitive routes, secrets hygiene.

### 5. Optional: orchestrator when `ENABLE_CHAIN_EVENTS=false` and **only** wallet UI posts

- **`POST /api/tasks`** now emits `task:posted` → orchestrator runs even without chain subscriptions.
- **Wallet-only posts** still need **`ENABLE_CHAIN_EVENTS=true`** (or a future `POST /api/tasks/notify` with tx receipt).
- **Implement:** Receipt watcher / poller if you want full wallet-only mode with events off.

---

## Recently completed (reference)

| Area | What was done |
|------|-----------------|
| **Coordinator logic** | Dropped "proportional sub-payments" and coordinator split from README to align with single assignee implementation in `TaskEscrow`. |
| **Reputation Oracle** | Surface oracle scores (`getScore`) alongside registry reputation in backend `getAllAgents()` mapping and frontend agent cards. |
| **On-chain Name resolution** | Updated `blockchain.ts` TaskAssigned log emission to parse human-readable name out of the contract state directly instead of sending undefined. |
| **Hardhat ABI sync** | Rewrote `packages/backend/src/config/contracts.ts` to natively import compiled artifact `.json` payloads via `with { type: "json" }`. |
| **Orchestrator trigger** | `POST /api/tasks` emits `task:posted`; dedupe `Set` avoids double runs when chain events also fire. |
| **Chain events in start scripts** | `start.bat` / `start.sh` set `ENABLE_CHAIN_EVENTS=true` for the backend process. |
| **WebSocket** | On connect: `history` message; periodic `ping`. |
| **Task assignment fields** | Orchestrator emits `agentAddress` + `agentName`; `task:assigned` handler stores both; UI `formatAssignee` + WS merge. |
| **LuffaWorker** | Works without `GEMINI_API_KEY` (stub text); Gemini when key present. |
| **Demo bot UIDs** | `packages/backend/src/config/demoBots.ts` shared with `deploy.ts` and `luffabot.ts`. |
| **Reputation ABI** | Oracle `getScore` / increment / decrement fragments added to config. |
| **Network graph** | `/graph` route + `NetworkGraph.tsx` restored in the app shell. |
| **Seed** | `scripts/seed.js` already existed; supports `API_URL` env override. |
| **Deps** | Removed unused `@anthropic-ai/sdk` from backend and agents packages. |
| **Env template** | Added root `.env.example`. |

---

*Last updated after implementation pass.*
