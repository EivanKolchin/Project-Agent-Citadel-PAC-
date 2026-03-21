import axios from "axios";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

export interface LuffaBotConfig {
  uid: string;
  secret: string;
  name: string;
  capabilities: string[];
}

export const LUFFA_BOTS: LuffaBotConfig[] = [
  {
    uid: process.env.LUFFA_BOT1_UID || "",
    secret: process.env.LUFFA_BOT1_SECRET || "",
    name: "Luffa Researcher",
    capabilities: ["research", "summarization", "analysis"],
  },
  {
    uid: process.env.LUFFA_BOT2_UID || "",
    secret: process.env.LUFFA_BOT2_SECRET || "",
    name: "Luffa Coder",
    capabilities: ["coding", "debugging", "complex_tasks"],
  },
  {
    uid: process.env.LUFFA_BOT3_UID || "",
    secret: process.env.LUFFA_BOT3_SECRET || "",
    name: "Luffa Analyst",
    capabilities: ["data", "finance", "math"],
  }
];

export class LuffaBotService {
  /**
   * Sends a 1-on-1 direct message using the specific bot's secret key.
   */
  public async sendMessage(botSecret: string, recipientUid: string, text: string) {
    try {
      const msgPayload = JSON.stringify({ text });
      const response = await axios.post("https://apibot.luffa.im/robot/send", {
        secret: botSecret,
        uid: recipientUid,
        msg: msgPayload
      });
      return response.data;
    } catch (e: any) {
      console.error("Failed to send Luffa Message:", e.message);
    }
  }

  /**
   * Polls unread messages directed at a specific bot
   */
  public async getMessages(botSecret: string) {
    try {
      const response = await axios.post("https://apibot.luffa.im/robot/receive", {
        secret: botSecret
      });
      return response.data;
    } catch (e: any) {
      console.error("Failed to receive Luffa Message:", e.message);
      return [];
    }
  }
}

export const luffaBotService = new LuffaBotService();