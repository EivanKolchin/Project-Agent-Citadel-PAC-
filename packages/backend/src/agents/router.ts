import Anthropic from "@anthropic-ai/sdk";
import { Agent, Task } from "../types";
import * as dotenv from "dotenv";

dotenv.config();

export interface RoutingDecision {
  taskId: string;
  selectedAgent: string;
  reasoning: string;
  confidence: number;
  timestamp: number;
}

export class RouterAgent {
  private anthropic: Anthropic;
  private routingLog: RoutingDecision[] = [];

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
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

    const response = await this.anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      temperature: 0.1,
    });

    const outputText = response.content[0].type === "text" ? response.content[0].text : "{}";
    
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

    const response = await this.anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: "user", content: `Decompose this task: ${task.description}` }],
      temperature: 0.2,
    });

    const outputText = response.content[0].type === "text" ? response.content[0].text : "[]";
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

    const response = await this.anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 10,
      system: systemPrompt,
      messages: [{ role: "user", content: `Task: ${taskDescription}` }],
      temperature: 0.1,
    });

    const outputText = response.content[0].type === "text" ? response.content[0].text.trim().toLowerCase() : "false";
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
