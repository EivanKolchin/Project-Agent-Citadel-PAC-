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

        const res = await withRetry(() => axios.post(`${agent.endpoint}/execute`, { taskId, description }, { timeout: 60000 }), 3, 500, `Agent Execution (${agent.name})`);
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

      // Safety Guardrails Check
      const isSafe = await this.router.isPromptSafe(cleanDescription);
      if (!isSafe) {
        this.eventEmitter.emit("activity", { type: "error", message: `Task ${taskId} rejected by Safety Guardrails for unsafe intent or restricted toolkits.` });
        throw new Error("Task rejected by Safety Guardrails. Unsafe prompt detected.");
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

          const subtaskPromises = subtasks.map(async (subDesc, i) => {
             const res = await this.assignAndExecute(agents, `sub-${taskId}-${i}`, subDesc);
             return { subDesc, res };
          });
          const completedSubtasks = await Promise.all(subtaskPromises);

          for (const { subDesc, res } of completedSubtasks) {
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
      this.eventEmitter.emit("activity", { type: "system", message: `Task ${taskId} complete. Running QA Validation...` });

      // Run QA Validation Step
      const validation = await this.router.validateResult(cleanDescription, finalResult.content);
      if (!validation.isValid) {
         this.eventEmitter.emit("activity", { type: "dao:dispute_start", taskId, message: `Task ${taskId} QA failed (${validation.reason}). Summoning Network DAO Nodes for consensus...` });

         // Fetch max 3 random idle agents to act as judges
         let otherAgents = agents.filter(a => a.address.toLowerCase() !== assignedAgent.toLowerCase());
         let daoJudges = otherAgents.sort(() => 0.5 - Math.random()).slice(0, 3);
         
         if (daoJudges.length > 0) {
             let yesVotes = 0;
             let noVotes = 0;
             
             for (const judge of daoJudges) {
                try {
                  this.eventEmitter.emit("activity", { type: "agent:thought", agent: judge.name, taskId, message: `Reviewing task ${taskId} as DAO Judge...` });
                  const judgePrompt = `As a decentralized network DAO Judge, evaluate if the following output successfully satisfies the original task description.
Respond strictly in JSON format: {"isValid": boolean, "reason": "1 sentence explanation"}
Task: ${cleanDescription}
Result: ${finalResult.content}`;

                  const passRes = await axios.post(`${judge.endpoint}/execute`, { taskId: `${taskId}-judge`, description: judgePrompt }, { timeout: 30000 });
                  const passContent = passRes.data.result?.content || passRes.data;
                  const jsonMatch = passContent.match(/\{[\s\S]*\}/);
                  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : passContent);
                  
                  if (parsed.isValid) {
                      yesVotes++;
                      this.eventEmitter.emit("activity", { type: "dao:vote", judge: judge.name, vote: "VALID", reason: parsed.reason, message: `DAO Judge ${judge.name} voted: VALID (${parsed.reason})` });
                  } else {
                      noVotes++;
                      this.eventEmitter.emit("activity", { type: "dao:vote", judge: judge.name, vote: "INVALID", reason: parsed.reason, message: `DAO Judge ${judge.name} voted: INVALID (${parsed.reason})` });
                  }
                } catch(e: any) {
                  noVotes++; // abstain defaults to rejecting the agent
                  this.eventEmitter.emit("activity", { type: "dao:vote", judge: judge.name, vote: "INVALID", reason: "Judge offline or abstained", message: `DAO Judge ${judge.name} abstained/failed.` });
                }
             }
             
             if (yesVotes > noVotes) {
                 this.eventEmitter.emit("activity", { type: "dao:dispute_end", result: "Agent Vindicated", message: `DAO Consensus Reached (${yesVotes} to ${noVotes}). Overriding router failure.` });
                 validation.isValid = true; // Override
             } else {
                 this.eventEmitter.emit("activity", { type: "dao:dispute_end", result: "Failure Upheld", message: `DAO Consensus Upheld Failure (${noVotes} to ${yesVotes}). Proceeding with slash.` });
             }
         } else {
            this.eventEmitter.emit("activity", { type: "system", message: "No other agents available for DAO Voting. Upholding AI router failure." });
         }
      }

      if (!validation.isValid) {
         this.eventEmitter.emit("activity", { type: "error", message: `Task ${taskId} failed validation: ${validation.reason}` });

         // Trigger Task failure on chain, punishes agent reputation & refunds user
         try {
             await this.blockchain.failTask(taskId);
             this.eventEmitter.emit("activity", { type: "system", message: `Task ${taskId} officially failed on-chain. Escrow Refunded.` });
         } catch(e: any) {
             console.error("Failed to push failTask on-chain:", e.message);
         }

         throw new Error(`Agent failed QA Validation: ${validation.reason}`);
      }

      this.eventEmitter.emit("activity", { type: "system", message: `Task ${taskId} passed QA. Submitting hash: ${resultHash.substring(0, 10)}...` });

      await withRetry(() => this.blockchain.submitResult(taskId, resultHash, assignedAgent), 1, 1500, "Blockchain Submit Result");
      
      this.eventEmitter.emit("task:completed", { taskId, result: finalResult });
      this.eventEmitter.emit("payment:sent", { from: "TaskEscrow", to: assignedAgent, amount: budgetEth });
      this.eventEmitter.emit("activity", { type: "payment:sent", message: `Payment of ${budgetEth} ETH released` });

    } catch (error: any) {
      console.error(`[${new Date().toISOString()}] Orchestrator failed on task ${taskId}:`, error);
      this.eventEmitter.emit("task:failed", { taskId, reason: error.message });
      this.eventEmitter.emit("activity", { type: "error", message: `Task ${taskId} failed: ${error.message}` });
      
      // If the overarching orchestrator loop crashes and the task was already assigned but never completed, fail it to un-lock escrow.
      try {
         await this.blockchain.failTask(taskId);
      } catch (e: any) {
         console.warn(`Could not fail task ${taskId} on chain. It might still be open or already failed.`, e.message);
      }
    }
  }
}
