import axios from "axios";
import * as dotenv from "dotenv";
import * as path from "path";
import { DEMO_LUFFA_BOTS_FOR_DEPLOY } from "../config/demoBots";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

export interface LuffaBotConfig {
  uid: string;
  secret: string;
  name: string;
  capabilities: string[];
}

/** Env overrides optional; UIDs default to the same values registered by `deploy:local`. */
export const LUFFA_BOTS: LuffaBotConfig[] = DEMO_LUFFA_BOTS_FOR_DEPLOY.map((b, i) => {
  const n = i + 1;
  return {
    uid: process.env[`LUFFA_BOT${n}_UID`] || b.uid,
    secret: process.env[`LUFFA_BOT${n}_SECRET`] || "",
    name: b.name,
    capabilities: [...b.caps],
  };
});

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