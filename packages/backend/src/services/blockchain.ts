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

  constructor(eventEmitter: EventEmitter) {
    this.eventEmitter = eventEmitter;

    const rpcUrl = process.env.ENDLESS_RPC_URL || "http://localhost:8545";
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);

    this.agentRegistry = new Contract(AGENT_REGISTRY_ADDRESS, AGENT_REGISTRY_ABI, this.signer);
    this.taskEscrow = new Contract(TASK_ESCROW_ADDRESS, TASK_ESCROW_ABI, this.signer);
    this.reputationOracle = new Contract(REPUTATION_ORACLE_ADDRESS, REPUTATION_ORACLE_ABI, this.signer);

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (AGENT_REGISTRY_ADDRESS) {
      this.agentRegistry.on("AgentRegistered", (agent, name, capabilities, event) => {
        this.eventEmitter.emit("AgentRegistered", { agent, name, capabilities, txHash: event.log.transactionHash });
      });
    }

    if (TASK_ESCROW_ADDRESS) {
      this.taskEscrow.on("TaskPosted", (taskId, description, bounty, event) => {
        this.eventEmitter.emit("TaskPosted", {
          taskId: taskId.toString(),
          description,
          bounty: ethers.formatEther(bounty),
          txHash: event.log.transactionHash
        });
      });

      this.taskEscrow.on("TaskAssigned", (taskId, agentAddress, event) => {
        this.eventEmitter.emit("TaskAssigned", {
          taskId: taskId.toString(),
          agentAddress,
          txHash: event.log.transactionHash
        });
      });

      this.taskEscrow.on("TaskCompleted", (taskId, agentAddress, resultHash, event) => {
        this.eventEmitter.emit("TaskCompleted", {
          taskId: taskId.toString(),
          agentAddress,
          resultHash,
          txHash: event.log.transactionHash
        });
      });
    }
  }

  async getAllAgents(): Promise<Agent[]> {
    if (!AGENT_REGISTRY_ADDRESS) return [];
    
    const agentsData = await this.agentRegistry.getAllAgents();
    
    const parsedAgents: Agent[] = agentsData.map((a: any) => ({
      address: a.wallet,
      name: a.name,
      description: a.description,
      endpoint: a.endpoint,
      capabilities: Array.from(a.capabilities),
      reputationScore: Number(a.reputationScore),
      tasksCompleted: Number(a.tasksCompleted),
      stakedAmount: ethers.formatEther(a.stakedAmount),
      active: a.active
    }));

    return parsedAgents.filter(a => a.active);
  }

  async postTask(description: string, bountyEth: string): Promise<string> {
    const value = ethers.parseEther(bountyEth);
    const deadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now

    const tx = await this.taskEscrow.postTask(description, deadline, { value });
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

  async assignTask(taskId: string, agentAddress: string): Promise<void> {
    const tx = await this.taskEscrow.assignTask(BigInt(taskId), agentAddress);
    await tx.wait();
  }

  async submitResult(taskId: string, resultHash: string, agentAddress: string): Promise<void> {
    // In our simplified mock, the signer is acting across multiple roles.
    // Usually the assigned agent would submit the result.
    const tx = await this.taskEscrow.submitResult(BigInt(taskId), resultHash);
    await tx.wait();

    // Automatically release payment if verified
    const releaseTx = await this.taskEscrow.releasePayment(BigInt(taskId));
    await releaseTx.wait();
  }

  async getOpenTasks(): Promise<Task[]> {
    if (!TASK_ESCROW_ADDRESS) return [];

    const tasksData = await this.taskEscrow.getOpenTasks();
    const statusMap: TaskStatus[] = ["open", "assigned", "completed", "failed"];

    return tasksData.map((t: any) => ({
      id: t.id.toString(),
      description: t.description,
      poster: t.poster,
      assignedAgent: t.assignedAgent === ethers.ZeroAddress ? undefined : t.assignedAgent,
      bounty: ethers.formatEther(t.bounty),
      deadline: Number(t.deadline),
      status: statusMap[Number(t.status)],
      resultHash: t.resultHash || undefined,
      createdAt: Number(t.createdAt)
    }));
  }

  async getNetworkStats(): Promise<NetworkStats> {
    let totalAgents = 0;
    if (AGENT_REGISTRY_ADDRESS) {
      const agents = await this.agentRegistry.getAllAgents();
      totalAgents = agents.length;
    }

    let activeTasks = 0;
    let completedTasks = 0;
    let totalVolumeWei = 0n;

    if (TASK_ESCROW_ADDRESS) {
      // NOTE: For exact total volume/stats, we might need a dedicated smart contract function
      // Here we approximate based on fetching open/latest tasks if possible,
      // or we can fetch the nextTaskId and iterate.
      const nextTaskId: bigint = await this.taskEscrow.nextTaskId();
      
      for (let i = 0n; i < nextTaskId; i++) {
        const task = await this.taskEscrow.tasks(i);
        if (Number(task.status) === 0 || Number(task.status) === 1) { // Open or Assigned
          activeTasks++;
        } else if (Number(task.status) === 2) { // Completed
          completedTasks++;
          // Add to volume only completed ones logic could apply, or total bounties posted:
          // We'll calculate volume as total assigned/completed bounty volume 
          // Note: In TaskEscrow, bounty is set to 0 to prevent reentrancy during release.
          // This would require a better way to track volume on chain over time.
        }
      }
    }

    return {
      totalAgents,
      activeTasks,
      completedTasks,
      totalVolume: ethers.formatEther(totalVolumeWei) // Approximation depending on structure
    };
  }
}
