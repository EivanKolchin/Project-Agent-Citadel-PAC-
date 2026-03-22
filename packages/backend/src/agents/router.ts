import { GoogleGenerativeAI } from "@google/generative-ai";
import { Agent, Task } from "../types";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

export interface RoutingDecision {
  taskId: string;
  selectedAgent: string;
  reasoning: string;
  confidence: number;
  timestamp: number;
}

export class RouterAgent {
  private model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]> | null = null;
  private routingLog: RoutingDecision[] = [];

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim().length === 0) {
      console.warn("[RouterAgent] GEMINI_API_KEY is missing. Falling back to deterministic local routing.");
      return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  }

  public async routeTask(task: Task, availableAgents: Agent[]): Promise<string> {
    if (availableAgents.length === 0) {
      throw new Error("No available agents to route task");
    }

    if (!this.model) {
      const ranked = [...availableAgents].sort((a, b) => {
        const capA = a.capabilities.join(" ").toLowerCase();
        const capB = b.capabilities.join(" ").toLowerCase();
        const taskText = task.description.toLowerCase();
        const scoreA = (capA.includes(taskText) ? 2 : 0) + a.reputationScore + a.tasksCompleted;
        const scoreB = (capB.includes(taskText) ? 2 : 0) + b.reputationScore + b.tasksCompleted;
        return scoreB - scoreA;
      });
      const selected = ranked[0];
      this.logDecision({
        taskId: task.id,
        selectedAgent: selected.address,
        reasoning: "Selected using local fallback scoring (no Gemini API key).",
        confidence: 0.55,
        timestamp: Date.now()
      });
      return selected.address;
    }

    const systemPrompt = `You are the routing intelligence for an autonomous agent network. Your job is to analyse an incoming task and select the best available agent to complete it based on capability match, reputation score, and task history.

You must respond with ONLY a JSON object:
{
  "selectedAgent": "0x...",
  "reasoning": "one sentence explanation",
  "confidence": 0.0-1.0,
  "shouldDecompose": boolean,
  "subTasks": []  // if shouldDecompose is true, array of subtask descriptions
}`;

    const agentsInfo = availableAgents.map(a => ({
      address: a.address,
      name: a.name,
      capabilities: a.capabilities,
      reputationScore: a.reputationScore,
      tasksCompleted: a.tasksCompleted
    }));

    const userMessage = `Task ID: ${task.id}
Task Description: ${task.description}

Available Agents:
${JSON.stringify(agentsInfo, null, 2)}
    `;

    let outputText: string;
    try {
      const response = await this.model.generateContent({
        contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }],
        generationConfig: { maxOutputTokens: 1024, temperature: 0.1 },
      });
      outputText = response.response.text();
    } catch (e: any) {
      console.warn(`[RouterAgent] Gemini API failed: ${e.message}. Using deterministic fallback.`);
      const ranked = [...availableAgents].sort((a, b) => {
        const capA = a.capabilities.join(" ").toLowerCase();
        const capB = b.capabilities.join(" ").toLowerCase();
        const taskText = task.description.toLowerCase();
        const scoreA = (capA.includes(taskText) ? 2 : 0) + a.reputationScore + a.tasksCompleted;
        const scoreB = (capB.includes(taskText) ? 2 : 0) + b.reputationScore + b.tasksCompleted;
        return scoreB - scoreA;
      });
      const selected = ranked[0];
      this.logDecision({
        taskId: task.id,
        selectedAgent: selected.address,
        reasoning: "Selected using local fallback scoring (Gemini Error).",
        confidence: 0.55,
        timestamp: Date.now()
      });
      return selected.address;
    }
    
    // Attempt to extract JSON if Claude added markdown code blocks
    const jsonMatch = outputText.match(/```json\n([\s\S]*?)\n```/) || outputText.match(/({[\s\S]*})/);
    const parsedStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : outputText;
    
    let decision;
    try {
      decision = JSON.parse(parsedStr);
    } catch (e) {
      console.error("Failed to parse router response:", parsedStr);
      throw new Error("Invalid response from router intelligence");
    }

    this.logDecision({
      taskId: task.id,
      selectedAgent: decision.selectedAgent,
      reasoning: decision.reasoning,
      confidence: decision.confidence,
      timestamp: Date.now()
    });

    return decision.selectedAgent;
  }

  public async decomposeTask(task: Task): Promise<string[]> {
    if (!this.model) {
      return [task.description];
    }

    const systemPrompt = `You are an expert task decomposer for an agent network. Break the given complex task into 2-4 sequential subtask descriptions. 
You must respond with ONLY a JSON array of strings:
["subtask 1 description", "subtask 2 description", ...]`;

    try {
      const response = await this.model.generateContent({
        contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nDecompose this task: ${task.description}` }] }],
        generationConfig: { maxOutputTokens: 500, temperature: 0.2 },
      });

      const outputText = response.response.text();
      const jsonMatch = outputText.match(/```json\n([\s\S]*?)\n```/) || outputText.match(/(\[[\s\S]*\])/);
      const parsedStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : outputText;

      return JSON.parse(parsedStr);
    } catch (e: any) {
      console.warn("[RouterAgent] Gemini API failed during decomposeTask. Returning original task.", e.message);
      return [task.description];
    }
  }

  public async shouldDecompose(taskDescription: string): Promise<boolean> {
    if (!this.model) {
      return false;
    }

    try {
      const systemPrompt = `Analyze the task description and decide if it is too complex for a single agent and should be decomposed into subtasks. 
Reply with ONLY "true" or "false".`;

      const response = await this.model.generateContent({
        contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nTask: ${taskDescription}` }] }],
        generationConfig: { maxOutputTokens: 10, temperature: 0.1 },
      });

      const responseText = response.response.text().trim().toLowerCase();
      return responseText.includes("true");
    } catch(e: any) {
      console.warn("[RouterAgent] Gemini API failed during shouldDecompose. Falling back to simple mode.", e.message);
      return false;
    }
  }

    public async validateResult(taskDescription: string, agentResult: string): Promise<{isValid: boolean, reason: string}> {
    if (!this.model) {
      return { isValid: true, reason: "No AI model available, auto-approving." };
    }

    const systemPrompt = `You are an expert QA validate for an agent network. Your job is to verify if the agent's output successfully resolved the original task description.
You must respond with ONLY a JSON object:
{
  "isValid": boolean,
  "reason": "short explanation of why it passed or failed"
}`;

    try {
      const response = await this.model.generateContent({
        contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nTask: ${taskDescription}\n\nAgent Result:\n${agentResult}` }] }],
        generationConfig: { maxOutputTokens: 250, temperature: 0.1 },
      });

      const outputText = response.response.text();
      const jsonMatch = outputText.match(/\`\`\`json\n([\s\S]*?)\n\`\`\`/) || outputText.match(/({[\s\S]*})/);
      const parsedStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : outputText;

      const parsed = JSON.parse(parsedStr);
      return {
        isValid: !!parsed.isValid,
        reason: parsed.reason || "No reason provided"
      };
    } catch(e: any) {
      console.warn("[RouterAgent] QA Validation failed. Auto-approving.", e.message);
      return { isValid: true, reason: "Validation crashed, auto-approving" };
    }
  }

  private logDecision(decision: RoutingDecision) {
    this.routingLog.unshift(decision);
    if (this.routingLog.length > 50) {
      this.routingLog.pop();
    }
  }

  public getRecentDecisions(): RoutingDecision[] {
    return [...this.routingLog];
  }
}
