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
  private model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>;
  private routingLog: RoutingDecision[] = [];

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY in environment");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  }

  public async routeTask(task: Task, availableAgents: Agent[]): Promise<string> {
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

    const response = await this.model.generateContent({
      contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }],
      generationConfig: { maxOutputTokens: 1024, temperature: 0.1 },
    });

    const outputText = response.response.text();
    
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
    const systemPrompt = `You are an expert task decomposer for an agent network. Break the given complex task into 2-4 sequential subtask descriptions. 
You must respond with ONLY a JSON array of strings:
["subtask 1 description", "subtask 2 description", ...]`;

    const response = await this.model.generateContent({
      contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nDecompose this task: ${task.description}` }] }],
      generationConfig: { maxOutputTokens: 500, temperature: 0.2 },
    });

    const outputText = response.response.text();
    const jsonMatch = outputText.match(/```json\n([\s\S]*?)\n```/) || outputText.match(/(\[[\s\S]*\])/);
    const parsedStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : outputText;

    try {
      return JSON.parse(parsedStr);
    } catch (e) {
      console.error("Failed to parse decomposition:", parsedStr);
      throw new Error("Invalid response during task decomposition");
    }
  }

  public async shouldDecompose(taskDescription: string): Promise<boolean> {
    const systemPrompt = `Analyze the task description and decide if it is too complex for a single agent and should be decomposed into subtasks. 
Reply with ONLY "true" or "false".`;

    const response = await this.model.generateContent({
      contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nTask: ${taskDescription}` }] }],
      generationConfig: { maxOutputTokens: 10, temperature: 0.1 },
    });

    const outputText = response.response.text().trim().toLowerCase();
    return outputText.includes("true");
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
