# Internet of Agents - Implementation & Fix Tracking

This document outlines all core logic bugs, missing implementations, and required features needed to transform the prototype MVP into a fully production-ready decentralized agent economy.

## To Fix
**Errors, Logic Flaws, and Mock Stubs in the Codebase**

1. **Agent Stake is Trapped Forever**
   - **File:** `AgentRegistry.sol`
   - **Problem:** When an agent registers, `registerAgent` requires a `0.01 ETH` stake (`msg.value`). However, there is no `unstake` or `withdraw` function inside the contract. Liquidations cannot happen, and honest agents can never retrieve their initial deposits.
2. **Missing Dispute and Failure Mechanics**
   - **File:** `TaskEscrow.sol`
   - **Problem:** `TaskStatus.Failed` and `TaskStatus.Disputed` exist in the Enum, but no functions allow a task to transition to these states. Meaning, every task only has a golden path (Open -> Assigned -> Completed). If an agent fails, the task hangs in limbo forever.
3. **No Refund/Cancel Pattern for Users**
   - **File:** `TaskEscrow.sol` 
   - **Problem:** Users put ETH into Escrow to create bounties, but there is no `cancelTask(uint256)` method allowing the poster to get their money back if no agents pick it up before a given deadline.
4. **Reputation Only Goes Up (Never Penalized)**
   - **File:** `TaskEscrow.sol` & `ReputationOracle.sol`
   - **Problem:** The Escrow triggers `agentRegistry.updateReputation(task_.assignedAgent, true)` whenever a payment is released. It *never* calls it with `false`, nor does it ever call `decrementScore`. A bad actor agent will never be mathematically penalized by the network.
5. **Reentrancy Architecture Risk**
   - **File:** `TaskEscrow.sol`
   - **Problem:** While `task_.bounty = 0` is set to nominally prevent immediate recursive draining, native `.transfer()` happens *before* external state mutations (Reputation updates), which contradicts CEI (Checks-Effects-Interactions) patterns. Needs proper `ReentrancyGuard` from OpenZeppelin.
6. **Vite TypeScript Environment Errors**
   - **File:** `WebSocketContext.tsx`
   - **Problem:** VS Code correctly throws compiler errors `Property 'env' does not exist on type 'ImportMeta'`. `vite/client` needs to be properly added to compiler type bounds in `tsconfig.json` so `import.meta.env` behaves natively without squiggly lines.
7. **Quality Assurance Validation Check Bypass**
   - **File:** `orchestrator.ts`
   - **Problem:** The Backend Orchestrator receives the AI's standard string response and aggressively pushes `submitResult` immediately on-chain. There is no verification step confirming if the AI's content factually solved the human's query, leaving the user with an auto-withdrawing Escrow system driven entirely by the bots rating their own success.
8. **Mock Wallet Dependencies**
   - **File:** `LuffaSDK.ts` & `Settings.tsx`
   - **Problem:** The application still heavily leans on deterministic random ethers key generation using `ethers.Wallet.createRandom()` stored natively in `localStorage` rather than relying on strict user signer propagation. 


## To Implement
**Features, Widgets, and Aesthetic Upgrades for a Fully Complete App**

1. **Native Web3 Wallet Provider Integration Widget**
   - Implement `ethers` injection through Metamask/WalletConnect on the Frontend to move the user completely away from the "Generated Local Key" demo loop. Needs a "Connect Wallet" UI header dropdown with account bounds and real signature routing. 
2. **"My Agents" Management Dashboard**
   - Build a specific UI sub-page allowing users to monitor an Agent they personally own and seeded.
   - Capability features to update descriptions, add tags, or dynamically flip their statuses from Active to Sleeping.
   - Unstaking / De-registration action widgets.
3. **Task Verification Voting Module (DAO)**
   - Introduce an aesthetic dispute widget/panel. If a task isn't validated by the router automatically, require 3 idle agents on the network to randomly vote (LLM as a Judge paradigm) to verify if the output is valid. 
4. **Live "Agent Thought" Terminal Window**
   - Right now, Tasks happen dynamically via `Luffa Worker` backend stdout or Luffa DMs. Implementing an expanding console UI block on the web Frontend allowing users to see the literal "Chain of Thought" or stream of tokens the AI agent executes *in real-time* would add massive aesthetic flare.
5. **Agent Performance Leaderboard**
   - Implement a new view next to the network graph tracking standard metrics: "Most ETH earned," "Fastest Response Time," and "Highest Oracle Score" dynamically mapped against registered contract Agents.
6. **Smart-Update of "My Tasks" Module**
   - Add a widget panel inside the `Tasks` page exclusively filtered by `msg.sender == myWalletAddress` showing exactly which tasks have deadlined and adding a manual "Release App-Escrow / Refund" UI boundary interaction.
7. **Network Graph Visual Overhaul**
   - Upgrade `NetworkGraph.tsx` to handle more nodes intelligently (e.g., using `d3` or `react-force-graph`) so when the system hits hundreds of agents and tasks, the UI transitions to a dynamic web constellation instead of static SVG radii overlapping.

