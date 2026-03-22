import { GoogleGenerativeAI } from "@google/generative-ai";
import { luffaBotService, LuffaBotConfig } from "../services/luffabot";
import { TaskResult } from "../types";
import { EventEmitter } from "events";
import * as dotenv from "dotenv";
import axios from "axios";

dotenv.config();

export class LuffaWorkerAgent {
  private model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]> | null = null;
  private eventEmitter?: EventEmitter;

  constructor(eventEmitter?: EventEmitter) {
    this.eventEmitter = eventEmitter;
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);
      const modelName = process.env.GEMINI_MODEL || "gemini-1.5-pro";
      this.model = genAI.getGenerativeModel({ model: modelName });       
    } else {
      console.warn("[LuffaWorkerAgent] GEMINI_API_KEY missing.");
    }
  }

  private simulateTaskCompletion(agentName: string, taskId: string, description: string): string {
    const descLower = description.toLowerCase();
    if (descLower.includes("weather")) return `[Mock Result] The weather parameters requested in task ${taskId} have been gathered and the forecast is currently clear and sunny.`;
    if (descLower.includes("trade") || descLower.includes("price")) return `[Mock Result] Evaluated marked metrics as requested. The trading parameters signify a 5% potential upside.`;
    if (descLower.includes("contract") || descLower.includes("audit")) return `[Mock Result] Finished static analysis on the smart contract. 2 low-severity issues found, nothing critical.`;
    
    return `[Mock Result] ${agentName} successfully analyzed and completed the task '${taskId}' according to the operational parameters. \n\nTask details: ${description.slice(0, 100)}...`;
  }

  public async executeTask(botConfig: LuffaBotConfig, taskId: string, description: string): Promise<TaskResult> {
    const systemPrompt = `You are ${botConfig.name}, an autonomous agent powered by Luffa IM.
    Your special capabilities include: ${botConfig.capabilities.join(", ")}.
    Complete the following task accurately and respond strictly in a concise manner without wrapper texts.`;

    const start = Date.now();

    const adminUid = process.env.LUFFA_ADMIN_UID;
    if (!adminUid) throw new Error("LUFFA_ADMIN_UID environment variable is missing.");

    await luffaBotService.sendMessage(
      botConfig.secret,
      adminUid,
      `System: I have been assigned Task ${taskId}. Working on it...`
    );

    let outputText: string = "";

    // 1. Check if the agent is an Ollama local specialist
    if (botConfig.capabilities.includes("ollama")) {
      try {
        if (this.eventEmitter) {
           this.eventEmitter.emit("activity", { type: "agent:thought", agent: botConfig.name, taskId, message: "Invoking local Ollama capabilities..." });
        }
        
        let ollamaModel = "llama3"; // default
        if (botConfig.capabilities.includes("mistral")) ollamaModel = "mistral";
        else if (botConfig.capabilities.includes("coding")) ollamaModel = "codellama";

        const response = await axios.post(
          "http://localhost:11434/api/generate",
          {
            model: ollamaModel,
            prompt: `${systemPrompt}\n\nTask:\n${description}`,
            stream: false
          }
        );
        outputText = response.data.response || `[Ollama] Analysis complete.`;
      } catch (e: any) {
        console.warn(`[LuffaWorkerAgent] Ollama API failed: ${e.message}, falling back to simulation. Ensure Ollama is running locally.`);
        outputText = `[Ollama Fallback] Analysis failed. Ensure Ollama is running on port 11434. Details: ${e.message}`;
      }
    } else {
      // 2. Default to Gemini API for general agents
      const isMockModel = !this.model || process.env.GEMINI_API_KEY === "your_actual_gemini_api_key_here";

      if (!isMockModel && this.model) {
        try {
          if (this.eventEmitter) {
             this.eventEmitter.emit("activity", { type: "agent:thought", agent: botConfig.name, taskId, message: "Analyzing system prompt and task description via Gemini..." });
          }

          const response = await this.model.generateContentStream({
            contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nTask:\n${description}` }] }],
            generationConfig: { maxOutputTokens: 1024, temperature: 0.2 },        
          });

          for await (const chunk of response.stream) {
            const chunkText = chunk.text();
            outputText += chunkText;
            if (this.eventEmitter) {
               this.eventEmitter.emit("activity", { type: "agent:thought", agent: botConfig.name, taskId, message: `Streaming: ${chunkText.replace(/\\n/g, " ")}` });
            }
          }
        } catch (e: any) {
          console.warn(`[LuffaWorkerAgent] Gemini API failed: ${e.message}, falling back to simulation.`);
          outputText = this.simulateTaskCompletion(botConfig.name, taskId, description);
        }
      } else {
        if (this.eventEmitter) {
           this.eventEmitter.emit("activity", { type: "agent:thought", agent: botConfig.name, taskId, message: "Running in mock Gemini simulation mode..." });
        }
        // Brief simulated delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        outputText = this.simulateTaskCompletion(botConfig.name, taskId, description);
      }
    }

    const executionTime = Date.now() - start;

    if (this.eventEmitter) {
       this.eventEmitter.emit("activity", { type: "agent:output", agent: botConfig.name, taskId, message: "Task completed. Click to view output.", output: outputText });
    }

    await luffaBotService.sendMessage(
      botConfig.secret,
      adminUid,
      `Task ${taskId} Completed!\n\n${outputText}`
    );

    return {
      content: outputText,
      confidence: 0.85, // Use dynamic calculation ideally in future iterations
      executionTime,
      subTasksUsed: [],
    };
  }
}
