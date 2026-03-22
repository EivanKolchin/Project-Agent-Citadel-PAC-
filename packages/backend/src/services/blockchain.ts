import { ethers, Contract, Provider, Signer } from "ethers";
import { EventEmitter } from "events";
import { Agent, Task, TaskStatus, NetworkStats } from "../types";
import {
  AGENT_REGISTRY_ADDRESS,
  TASK_ESCROW_ADDRESS,
  REPUTATION_ORACLE_ADDRESS,
  AGENT_REGISTRY_ABI,
  TASK_ESCROW_ABI,
  REPUTATION_ORACLE_ABI,
} from "../config/contracts";
import * as dotenv from "dotenv";

dotenv.config();

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private agentRegistry: Contract;
  private taskEscrow: Contract;
  private reputationOracle: Contract;
  private eventEmitter: EventEmitter;
  private rpcUrl: string;
  private rpcAvailable = false;

  constructor(eventEmitter: EventEmitter) {
    this.eventEmitter = eventEmitter;

    const rpcUrl = process.env.ENDLESS_RPC_URL || "http://localhost:8545";
    const chainId = Number(process.env.ENDLESS_CHAIN_ID || 31337);
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    this.rpcUrl = rpcUrl;

    this.provider = new ethers.JsonRpcProvider(
      rpcUrl,
      { name: "endless", chainId },
      { staticNetwork: true }
    );
    this.signer = new ethers.Wallet(privateKey, this.provider);

    this.agentRegistry = new Contract(AGENT_REGISTRY_ADDRESS, AGENT_REGISTRY_ABI, this.signer);
    this.taskEscrow = new Contract(TASK_ESCROW_ADDRESS, TASK_ESCROW_ABI, this.signer);
    this.reputationOracle = new Contract(REPUTATION_ORACLE_ADDRESS, REPUTATION_ORACLE_ABI, this.signer);

    // Contract event subscriptions can trigger noisy reconnect loops when RPC is offline.
    if (process.env.ENABLE_CHAIN_EVENTS === "true") {
      this.setupEventListeners();
    }
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs = 2500): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => reject(new Error("RPC timeout")), timeoutMs);
        })
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async ensureRpcAvailable(): Promise<boolean> {
    try {
      await this.withTimeout(this.provider.getBlockNumber(), 1500);
      this.rpcAvailable = true;
      return true;
    } catch {
      this.rpcAvailable = false;
      return false;
    }
  }

  private setupEventListeners() {
    if (AGENT_REGISTRY_ADDRESS && this.agentRegistry) {
      this.agentRegistry.on("AgentRegistered", (agent, name, capabilities, event) => {
        this.eventEmitter.emit("agent:registered", { agent, name, capabilities, txHash: event.log.transactionHash });
      });
    }

    if (TASK_ESCROW_ADDRESS && this.taskEscrow) {
      this.taskEscrow.on("TaskPosted", (taskId, description, bounty, event) => {
        this.eventEmitter.emit("task:posted", {
          taskId: taskId.toString(),
          description,
          bounty: ethers.formatEther(bounty),
          txHash: event.log.transactionHash
        });
      });

      this.taskEscrow.on("TaskAssigned", async (taskId, agentAddress, event) => {
        let agentName = "Unknown Agent";
        try {
          if (this.agentRegistry) {
            const currentAgents = await this.agentRegistry.getAllAgents();
            const found = currentAgents.find((a: any) => a.wallet.toLowerCase() === agentAddress.toLowerCase());
            if (found) agentName = found.name;
          }
        } catch(e) { /* ignore */ }
        
        this.eventEmitter.emit("task:assigned", {
          taskId: taskId.toString(),
          agentAddress,
          agentName,
          txHash: event.log.transactionHash
        });
      });

      this.taskEscrow.on("TaskCompleted", (taskId, agentAddress, resultHash, event) => {
        this.eventEmitter.emit("task:completed", {
          taskId: taskId.toString(),
          agentAddress,
          result: resultHash,
          txHash: event.log.transactionHash
        });
      });
    }
  }

  async fundAddress(address: string, amountEth: string): Promise<void> {
    if (!(await this.ensureRpcAvailable())) return;
    const tx = await this.withTimeout(this.signer.sendTransaction({
        to: address,
        value: ethers.parseEther(amountEth)
    }));
    await tx.wait();
  }

  async getAllAgents(): Promise<Agent[]> {
    if (!AGENT_REGISTRY_ADDRESS) return [];
    if (!(await this.ensureRpcAvailable())) return [];

    const agentsData = await this.withTimeout(this.agentRegistry.getAllAgents());
    
    const parsedAgents: Agent[] = await Promise.all(agentsData.map(async (a: any) => {
      let oracleScore = 0;
      if (REPUTATION_ORACLE_ADDRESS) {
        try {
          oracleScore = Number(await this.reputationOracle.getScore(a.wallet));
        } catch (e) { /* ignore if not available */ }
      }
      return {
        address: a.wallet,
        name: a.name,
        description: a.description,
        endpoint: a.endpoint,
        capabilities: Array.from(a.capabilities),
        reputationScore: Number(a.reputationScore || 0),
        oracleScore,
        tasksCompleted: Number(a.tasksCompleted || 0),
        stakedAmount: ethers.formatEther(a.stakedAmount || 0),
        active: a.active
      };
    }));

    return parsedAgents.filter(a => a.active);
  }

  async postTask(description: string, bountyEth: string): Promise<string> {
    if (!(await this.ensureRpcAvailable())) {
      throw new Error(`Blockchain RPC unavailable at ${this.rpcUrl}`);
    }
    const value = ethers.parseEther(bountyEth);
    const deadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now

    const tx = await this.withTimeout(this.taskEscrow.postTask(description, deadline, { value }));
    const receipt = await tx.wait();

    // Parse logs to find TaskPosted event
    for (const log of receipt.logs) {
      try {
        const parsedLog = this.taskEscrow.interface.parseLog(log);
        if (parsedLog && parsedLog.name === "TaskPosted") {
          return parsedLog.args.taskId.toString();
        }
      } catch (e) {
        // Log is not from this contract or not parsable
      }
    }

    throw new Error("TaskPosted event not found in transaction receipt");
  }

  async failTask(taskId: string): Promise<void> {
    if (!(await this.ensureRpcAvailable())) return;
    const tx = await this.withTimeout(this.taskEscrow.failTask(BigInt(taskId)));
    await tx.wait();
  }

  async assignTask(taskId: string, agentAddress: string): Promise<void> {
    if (!(await this.ensureRpcAvailable())) return;
    const tx = await this.withTimeout(this.taskEscrow.assignTask(BigInt(taskId), agentAddress));
    await tx.wait();
  }

  async submitResult(taskId: string, resultHash: string, agentAddress: string): Promise<void> {
    if (!(await this.ensureRpcAvailable())) return;
    // In our simplified mock, the signer is acting across multiple roles.
    // Usually the assigned agent would submit the result.
    // Wait for the simulated agent processing time
    console.log(`[Blockchain] Agent ${agentAddress} submitting result for Task ${taskId}: ${resultHash}`);
    
    // Instead of using the deployer wallet for EVERYTHING, we map the agentAddress back to the exact Hardhat test wallet index.
    // We deterministically derived these wallets in deploy.ts. Wallet 0 is Deployer, Wallets 1-3 are Luffa Bots.
    let targetSigner = this.signer;
    try {
      const mnemonic = "test test test test test test test test test test test junk"; // Default hardhat mnemonic
      
      // Let's iterate index 1..9 to see if any match the agentAddress
      for(let i=1; i<10; i++) {
        const derivedWallet = ethers.HDNodeWallet.fromPhrase(mnemonic, "", "m/44'/60'/0'/0/" + i);
        if(derivedWallet.address.toLowerCase() === agentAddress.toLowerCase()) {
          targetSigner = new ethers.Wallet(derivedWallet.privateKey, this.provider);
          break;
        }
      }
    } catch(e) {
      console.warn("Could not derive agent signer, falling back to deployer:", e);
    }
    
    const taskEscrowForAgent = new Contract(TASK_ESCROW_ADDRESS, TASK_ESCROW_ABI, targetSigner);
    const tx = await this.withTimeout(taskEscrowForAgent.submitResult(BigInt(taskId), resultHash));
    await tx.wait();

    // Automatically release payment if verified
    const releaseTx = await this.withTimeout(this.taskEscrow.releasePayment(BigInt(taskId)));
    await releaseTx.wait();
  }

  async getOpenTasks(): Promise<Task[]> {
    if (!TASK_ESCROW_ADDRESS) return [];
    if (!(await this.ensureRpcAvailable())) return [];

    const tasksData = await this.withTimeout(this.taskEscrow.getOpenTasks());
    const statusMap: TaskStatus[] = ["open", "assigned", "completed", "failed"];

    return tasksData.map((t: any) => ({
      id: t.id.toString(),
      description: t.description,
      poster: t.poster,
      assignedAgent: t.assignedAgent === ethers.ZeroAddress ? undefined : t.assignedAgent,
      bounty: ethers.formatEther(t.bounty || 0),
      deadline: Number(t.deadline || 0),
      status: statusMap[Number(t.status || 0)],
      resultHash: t.resultHash || undefined,
      createdAt: Number(t.createdAt || 0)
    }));
  }

  async getNetworkStats(): Promise<NetworkStats> {
    if (!(await this.ensureRpcAvailable())) {
      return { totalAgents: 0, activeTasks: 0, completedTasks: 0, totalVolume: "0.0" };
    }
    let totalAgents = 0;
    if (AGENT_REGISTRY_ADDRESS) {
      const agents = await this.withTimeout(this.agentRegistry.getAllAgents());
      totalAgents = agents.length;
    }

    let activeTasks = 0;
    let completedTasks = 0;
    let totalVolumeWei = 0n;

    if (TASK_ESCROW_ADDRESS) {
      const nextTaskId: bigint = await this.withTimeout(this.taskEscrow.nextTaskId());
      
      // Prevent network timeouts by avoiding full iteration if there are too many tasks
      // Instead, just quickly grab active tasks using our in-memory cache if we implemented one
      // For now, we limit the iteration to the last 100 tasks to prevent RPC timeouts
      const startId = nextTaskId > 100n ? nextTaskId - 100n : 0n;
      let openTasksInWindow = 0;
      let compTasksInWindow = 0;

      const promises = [];
      for (let i = startId; i < nextTaskId; i++) {
        promises.push(this.taskEscrow.tasks(i));
      }
      
      try {
        const tasks = await this.withTimeout(Promise.all(promises));
        for (const task of tasks) {
          if (Number(task.status) === 0 || Number(task.status) === 1) { // Open or Assigned
            openTasksInWindow++;
          } else if (Number(task.status) === 2 || Number(task.status) === 3) { // Completed or Failed
            compTasksInWindow++;
            // Approximated total volume: counting the bounty if logic applies (it resets to 0 in Escrow on completion, unfortunately)
            // So we just add a dummy or tracked increment if we had events
          }
        }
      } catch (err) {
        console.error("Failed to fetch task stats batch:", err);
      }

      // Extrapolate for UI purposes if we have more than 100 tasks
      if (nextTaskId > 100n) {
        activeTasks = openTasksInWindow;
        completedTasks = Number(nextTaskId) - openTasksInWindow; 
      } else {
        activeTasks = openTasksInWindow;
        completedTasks = compTasksInWindow;
      }
    }

    return {
      totalAgents,
      activeTasks,
      completedTasks,
      totalVolume: ethers.formatEther(totalVolumeWei || 0) // Approximation
    };
  }
}
