import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ethers } from 'ethers';

export interface AgentConfig {
  name: string;
  description: string;
  capabilities: string[];
  port: number;
  geminiApiKey: string;
  privateKey?: string;      // Wallet private key for staking/txs
  registryAddress?: string; // Blockchain contract addr
  rpcUrl?: string;          // Endless RPC
}

/**
 * Base class for writing 3rd party AI agents that securely plug into 
 * the Internet of Agents Open Network.
 */
export class AgentClient {
  private app = express();
  private ai: GoogleGenerativeAI;
  private model: any;

  constructor(private config: AgentConfig) {
    this.app.use(express.json());
    this.ai = new GoogleGenerativeAI(config.geminiApiKey);
    this.model = this.ai.getGenerativeModel({ model: 'gemini-1.5-pro' });

    // Expose webhook endpoints for Orchestrator/Escrow
    this.app.post('/execute', this.handleExecute.bind(this));
    this.app.get('/health', (req, res) => res.json({ status: 'active', name: this.config.name }));
  }

  private async handleExecute(req: express.Request, res: express.Response) {
    const { taskId, description } = req.body;
    console.log(`\n[${this.config.name}] 📥 Received Task ${taskId}: ${description}`);
    
    try {
      const prompt = `You are ${this.config.name}, an expert specialized in: ${this.config.capabilities.join(', ')}. 
      Please fulfill the following task accurately and concisely.
      Task Description: ${description}`;
      
      const startTime = Date.now();
      const response = await this.model.generateContent(prompt);
      const text = response.response.text();
      const executionTime = Date.now() - startTime;

      console.log(`[${this.config.name}] ✅ Task completed in ${executionTime}ms. Returning result webhook.`);

      // Return payload conformant to TaskResult interface
      res.json({
        result: {
          content: text.trim(),
          confidence: 0.95,
          executionTime,
          subTasksUsed: []
        }
      });
    } catch (error: any) {
      console.error(`[${this.config.name}] ❌ Task failed!`, error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Boots the local webhook server and optionally registers the agent's identity 
   * and capabilities on the Endless blockchain.
   */
  public async start() {
    this.app.listen(this.config.port, async () => {
      console.log(`\n===========================================`);
      console.log(`🤖 [${this.config.name}] Agent Hub Started `);
      console.log(`===========================================`);
      console.log(`🔗 Endpoint: http://localhost:${this.config.port}`);
      console.log(`🧠 Capabilities: ${this.config.capabilities.join(', ')}`);

      if (this.config.registryAddress && this.config.privateKey && this.config.rpcUrl) {
        console.log(`\n📡 Registering existence continuously to Endless RPC...`);
        try {
            const provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
            const wallet = new ethers.Wallet(this.config.privateKey, provider);
            console.log(`💳 Linked Wallet: ${wallet.address}`);
            console.log(`📡 Registering to AgentRegistry at ${this.config.registryAddress}...`);
            
            const abi = ["function registerAgent(string name, string description, string endpoint, string[] capabilities) payable"];
            const registry = new ethers.Contract(this.config.registryAddress, abi, wallet);
            
            const tx = await registry.registerAgent(
              this.config.name,
              this.config.description,
              `http://localhost:${this.config.port}/execute`,
              this.config.capabilities,
              { value: ethers.parseEther("0.01") } // Required stake
            );
            
            console.log(`⏳ Waiting for transaction confirmation... Hash: ${tx.hash}`);
            await tx.wait();
            console.log(`✅ Agent successfully registered on-chain! Visible to Router Orchestrators.`);
        } catch (e: any) {
            console.log(`⚠️ Warning: Blockchain registration skipped via error (${e.message})`);
        }
      } else {
        console.log(`\n⚠️ Note: Agent started in OFF-CHAIN mode (No wallet keys provided). 
             Must be manually registered via frontend dashboard to receive actual bounty payments.`);
      }

      console.log(`\n⌛ Listening for tasks...`);
    });
  }
}
