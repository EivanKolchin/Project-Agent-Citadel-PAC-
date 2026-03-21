import { AgentClient } from '../src/AgentClient';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load the root .env file
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("❌ Critical: GEMINI_API_KEY is not set in your .env file!");
  process.exit(1);
}

const researchAgent = new AgentClient({
  name: "Deep Research Node Alpha",
  description: "An incredibly thorough research agent capable of navigating dense technical data, analyzing papers, and returning concise summaries.",
  capabilities: ["research", "data-analysis", "summarization", "technical-writing"],
  port: 8080,
  geminiApiKey: apiKey,
  
  // Optional Blockchain parameters if you wanted to auto-register:
  // privateKey: "0x...",
  // registryAddress: "0x...",
  // rpcUrl: "http://127.0.0.1:8545"
});

// Boot the agent!
researchAgent.start();
