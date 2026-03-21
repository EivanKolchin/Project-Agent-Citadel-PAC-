import { BlockchainService } from "./services/blockchain";
import { RouterAgent } from "./agents/router";
import { Task, Agent, TaskResult } from "./types";
import { EventEmitter } from "events";
import axios from "axios";
import crypto from "crypto";

const withRetry = async <T>(fn: () => Promise<T>, retries = 3, baseDelay = 500, label = "Operation"): Promise<T> => {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (e: any) {
      attempt++;
      if (attempt >= retries) throw e;
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(`[${new Date().toISOString()}] ${label} failed. Retrying ${attempt}/${retries} in ${delay}ms... (${e.message})`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error("Retry loop exhausted");
};

export class Orchestrator {
  constructor(
    private blockchain: BlockchainService,
    private router: RouterAgent,
    private eventEmitter: EventEmitter
  ) {}

  private async assignAndExecute(agents: Agent[], taskId: string, description: string, reqCapabilities: string[] = [], manualTargetAddress?: string): Promise<{ result: TaskResult, agent: string }> {
    let activeAgents = [...agents];
    
    while (activeAgents.length > 0) {
      let assignedAgent = manualTargetAddress;
      
      if (!assignedAgent) {
        assignedAgent = await this.router.routeTask({ id: taskId, description } as Task, activeAgents);
      }
      
      const agent = activeAgents.find(a => a.address.toLowerCase() === assignedAgent?.toLowerCase());
      
      if (!agent) {
        if (manualTargetAddress) throw new Error(`Manually selected agent ${manualTargetAddress} not found`);
        throw new Error("Router selected an unknown agent address");
      }

      try {
        await withRetry(() => this.blockchain.assignTask(taskId, assignedAgent!), 1, 1000, "Blockchain Assign Task");
        this.eventEmitter.emit("task:assigned", {
          taskId,
          agentName: agent.name,
          agentAddress: assignedAgent!,
        });
        this.eventEmitter.emit("activity", { type: "agent:hired", message: `${agent.name} hired for task ${taskId}` });

        const res = await withRetry(() => axios.post(`${agent.endpoint}/execute`, { taskId, description }), 3, 500, `Agent Execution (${agent.name})`);
        return { result: res.data.result, agent: assignedAgent! };
      } catch (e: any) {
        console.error(`[${new Date().toISOString()}] Agent ${agent.name} failed. Removing from active roster and retrying...`, e.message);
        if (manualTargetAddress) throw new Error(`Manually selected agent failed: ${e.message}`);
        activeAgents = activeAgents.filter(a => a.address !== assignedAgent);
        if (activeAgents.length === 0) throw new Error("All capable agents failed");
      }
    }
    throw new Error("Agent routing failed. No active agents found.");
  }

  public async handleNewTask(taskId: string, description: string, budgetEth: string) {
    try {
      this.eventEmitter.emit("activity", { type: "system", message: `New task ${taskId} received: ${description.substring(0, 50)}...` });
      
      const agents = await this.blockchain.getAllAgents();
      if (agents.length === 0) {
        throw new Error("No active agents available on the network");
      }

      let manualTargetAddress: string | undefined = undefined;
      let cleanDescription = description;

      // Extract manual target if embedded like [TARGET:0x123]
      const targetMatch = description.match(/^\[TARGET:(0x[a-fA-F0-9]{40})\](.*)/s);
      if (targetMatch) {
         manualTargetAddress = targetMatch[1];
         cleanDescription = targetMatch[2].trim();
         this.eventEmitter.emit("activity", { type: "system", message: `Task ${taskId} is manually targeted to ${manualTargetAddress}` });
      }

      const shouldDecompose = !manualTargetAddress && await this.router.shouldDecompose(cleanDescription);
      let finalResult: TaskResult;
      let assignedAgent: string = "";

      if (shouldDecompose) {
        this.eventEmitter.emit("activity", { type: "system", message: `Task ${taskId} complex, decomposing...` });
        
        try {
          const res = await this.assignAndExecute(agents.filter(a => a.capabilities.includes("complex_tasks")), taskId, cleanDescription);
          finalResult = res.result;
          assignedAgent = res.agent;
        } catch (e) {
          // Fallback manual...
          console.warn("Coordinator routing failed, falling back to manual orchestration");
          const subtasks = await this.router.decomposeTask({ id: taskId, description: cleanDescription } as Task);
          let fullContent = "Aggregated Result:\n";
          let combinedConfidence = 0;
          let subTasksUsed: string[] = [];

          for (let i = 0; i < subtasks.length; i++) {
             const subDesc = subtasks[i];
             const res = await this.assignAndExecute(agents, `sub-${taskId}-${i}`, subDesc);
             fullContent += `\n### ${subDesc}\n${res.result.content}\n`;
             combinedConfidence += res.result.confidence;
             subTasksUsed.push(res.agent);
          }

          finalResult = {
            content: fullContent,
            confidence: combinedConfidence / subtasks.length,
            executionTime: 0,
            subTasksUsed
          };
          assignedAgent = agents[0].address; 
        }

      } else {
        const res = await this.assignAndExecute(agents, taskId, cleanDescription, [], manualTargetAddress);
        finalResult = res.result;
        assignedAgent = res.agent;
      }

      const resultHash = crypto.createHash("sha256").update(finalResult.content).digest("hex");
      this.eventEmitter.emit("activity", { type: "system", message: `Task ${taskId} complete. Submitting hash: ${resultHash.substring(0, 10)}...` });
      
      await withRetry(() => this.blockchain.submitResult(taskId, resultHash, assignedAgent), 1, 1500, "Blockchain Submit Result");
      
      this.eventEmitter.emit("task:completed", { taskId, result: finalResult });
      this.eventEmitter.emit("payment:sent", { from: "TaskEscrow", to: assignedAgent, amount: budgetEth });
      this.eventEmitter.emit("activity", { type: "payment:sent", message: `Payment of ${budgetEth} ETH released` });

    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] Orchestrator failed on task ${taskId}:`, error);
      this.eventEmitter.emit("task:failed", { taskId, reason: error.message });
      this.eventEmitter.emit("activity", { type: "error", message: `Task ${taskId} failed: ${error.message}` });
    }
  }
}
