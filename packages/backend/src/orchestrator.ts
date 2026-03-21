import { BlockchainService } from "./services/blockchain";
import { RouterAgent } from "./agents/router";
import { Task, Agent, TaskResult } from "./types";
import { EventEmitter } from "events";
import axios from "axios";
import crypto from "crypto";

export class Orchestrator {
  constructor(
    private blockchain: BlockchainService,
    private router: RouterAgent,
    private eventEmitter: EventEmitter
  ) {}

  public async handleNewTask(taskId: string, description: string, budgetEth: string) {
    try {
      this.eventEmitter.emit("activity", { type: "system", message: `New task ${taskId} received: ${description}` });
      
      const agents = await this.blockchain.getAllAgents();
      if (agents.length === 0) {
        throw new Error("No active agents available on the network");
      }

      const shouldDecompose = await this.router.shouldDecompose(description);
      let finalResult: TaskResult;
      let assignedAgent: string = "";

      if (shouldDecompose) {
        this.eventEmitter.emit("activity", { type: "system", message: `Task ${taskId} complex, decomposing...` });
        
        // Find Coordinator Agent to delegate to
        const coordinator = agents.find(a => a.capabilities.includes("complex_tasks") || a.name === "CoordinatorAgent");
        
        if (coordinator) {
          assignedAgent = coordinator.address;
          await this.blockchain.assignTask(taskId, assignedAgent);
          
          this.eventEmitter.emit("task:assigned", { taskId, agentName: coordinator.name });
          this.eventEmitter.emit("activity", { type: "agent:hired", message: `Coordinator ${coordinator.name} hired for ${taskId}` });

          const res = await axios.post(`${coordinator.endpoint}/execute`, {
            taskId,
            description
          });
          
          finalResult = res.data.result;
        } else {
           // Fallback: manual orchestrator decomposition
           const subtasks = await this.router.decomposeTask({ id: taskId, description } as Task);
           let fullContent = "Aggregated Result:\n";
           let combinedConfidence = 0;
           let subTasksUsed: string[] = [];

           for (let i = 0; i < subtasks.length; i++) {
             const subDesc = subtasks[i];
             const subAgentAddr = await this.router.routeTask({ id: `sub-${taskId}-${i}`, description: subDesc } as Task, agents);
             const subAgent = agents.find(a => a.address === subAgentAddr);
             
             if (subAgent) {
                this.eventEmitter.emit("activity", { type: "agent:hired", message: `Sub-agent ${subAgent.name} hired for subtask` });
                const res = await axios.post(`${subAgent.endpoint}/execute`, {
                  taskId: `sub-${taskId}-${i}`,
                  description: subDesc
                });
                
                fullContent += `\n### ${subDesc}\n${res.data.result.content}\n`;
                combinedConfidence += res.data.result.confidence;
                subTasksUsed.push(subAgent.address);
             }
           }

           finalResult = {
             content: fullContent,
             confidence: combinedConfidence / subtasks.length,
             executionTime: 0,
             subTasksUsed
           };
           assignedAgent = agents[0].address; // Hack: assign to first available for payment if no coordinator
        }

      } else {
        // Direct Assignment
        assignedAgent = await this.router.routeTask({ id: taskId, description } as Task, agents);
        const agent = agents.find(a => a.address === assignedAgent);
        
        if (!agent) {
          throw new Error("Router selected an unknown agent address");
        }

        await this.blockchain.assignTask(taskId, assignedAgent);
        this.eventEmitter.emit("task:assigned", { taskId, agentName: agent.name });
        this.eventEmitter.emit("activity", { type: "agent:hired", message: `${agent.name} assigned to task ${taskId}` });

        const res = await axios.post(`${agent.endpoint}/execute`, {
          taskId,
          description
        });

        finalResult = res.data.result;
      }

      // Hash result and submit
      const resultHash = crypto.createHash("sha256").update(finalResult.content).digest("hex");
      
      this.eventEmitter.emit("activity", { type: "system", message: `Task ${taskId} complete. Submitting hash: ${resultHash.substring(0, 10)}...` });
      
      await this.blockchain.submitResult(taskId, resultHash, assignedAgent);
      
      // Emit completions
      this.eventEmitter.emit("task:completed", { taskId, result: finalResult });
      this.eventEmitter.emit("payment:sent", { from: "TaskEscrow", to: assignedAgent, amount: budgetEth });
      this.eventEmitter.emit("activity", { type: "payment:sent", message: `Payment of ${budgetEth} ETH released to ${assignedAgent}` });

    } catch (error: any) {
      console.error(`Orchestrator failed on task ${taskId}:`, error);
      this.eventEmitter.emit("activity", { type: "error", message: `Task ${taskId} failed: ${error.message}` });
    }
  }
}
