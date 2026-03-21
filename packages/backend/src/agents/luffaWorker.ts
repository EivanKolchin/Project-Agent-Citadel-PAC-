import { GoogleGenerativeAI } from "@google/generative-ai";
import { luffaBotService, LuffaBotConfig } from "../services/luffabot";
import { TaskResult } from "../types";
import * as dotenv from "dotenv";

dotenv.config();

export class LuffaWorkerAgent {
  private model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY in environment");
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  }

  public async executeTask(botConfig: LuffaBotConfig, taskId: string, description: string): Promise<TaskResult> {
    const systemPrompt = `You are ${botConfig.name}, an autonomous agent powered by Luffa IM.
    Your special capabilities include: ${botConfig.capabilities.join(", ")}.
    Complete the following task accurately and respond strictly in a concise manner without wrapper texts.`;

    const start = Date.now();

    // 1. Send IM warning to the requester to simulate real world Luffa interaction
    // We assume 'luffa_dev_123' as the task poster UID for the Demo
    await luffaBotService.sendMessage(
      botConfig.secret,
      "luffa_dev_123",
      `System: I have been assigned Task ${taskId}. Working on it...`
    );

    // 2. Perform the actual cognitive work using Gemini
    const response = await this.model.generateContent({
      contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nTask:\n${description}` }] }],
      generationConfig: { maxOutputTokens: 1024, temperature: 0.2 },
    });

    const outputText = response.response.text();
    const executionTime = Date.now() - start;

    // 3. Send the final task out to the Luffa User before completing
    await luffaBotService.sendMessage(
      botConfig.secret,
      "luffa_dev_123",
      `Task ${taskId} Completed!\n\n${outputText}`
    );

    return {
      content: outputText,
      confidence: 0.95,
      executionTime,
      subTasksUsed: []
    };
  }
}
