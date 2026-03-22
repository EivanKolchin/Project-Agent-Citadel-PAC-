import { GoogleGenerativeAI } from "@google/generative-ai";
import { luffaBotService, LuffaBotConfig } from "../services/luffabot";
import { TaskResult } from "../types";
import * as dotenv from "dotenv";

dotenv.config();

export class LuffaWorkerAgent {
  private model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]> | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);
      this.model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    } else {
      console.warn("[LuffaWorkerAgent] GEMINI_API_KEY missing — using local stub responses for /api/luffa/*.");
    }
  }

  public async executeTask(botConfig: LuffaBotConfig, taskId: string, description: string): Promise<TaskResult> {
    const systemPrompt = `You are ${botConfig.name}, an autonomous agent powered by Luffa IM.
    Your special capabilities include: ${botConfig.capabilities.join(", ")}.
    Complete the following task accurately and respond strictly in a concise manner without wrapper texts.`;

    const start = Date.now();

    await luffaBotService.sendMessage(
      botConfig.secret,
      process.env.LUFFA_ADMIN_UID || "luffa_dev_123",
      `System: I have been assigned Task ${taskId}. Working on it...`
    );

    let outputText: string;
    if (this.model) {
      try {
        const response = await this.model.generateContent({
          contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nTask:\n${description}` }] }],
          generationConfig: { maxOutputTokens: 1024, temperature: 0.2 },
        });
        outputText = response.response.text();
      } catch (e: any) {
        console.warn(`[LuffaWorkerAgent] Gemini API failed: ${e.message}. Using local stub response.`);
        outputText = `[Local stub — Gemini API failed]\n\n${botConfig.name} summary for task ${taskId}:\n${description.slice(0, 500)}${description.length > 500 ? "…" : ""}`;
      }
    } else {
      outputText = `[Local stub — add GEMINI_API_KEY for full AI]\n\n${botConfig.name} summary for task ${taskId}:\n${description.slice(0, 500)}${description.length > 500 ? "…" : ""}`;
    }

    const executionTime = Date.now() - start;

    await luffaBotService.sendMessage(
      botConfig.secret,
      process.env.LUFFA_ADMIN_UID || "luffa_dev_123",
      `Task ${taskId} Completed!\n\n${outputText}`
    );

    return {
      content: outputText,
      confidence: this.model ? 0.95 : 0.5,
      executionTime,
      subTasksUsed: [],
    };
  }
}
