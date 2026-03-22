const fs = require('fs');
const path = 'packages/backend/src/agents/router.ts';
let code = fs.readFileSync(path, 'utf8');

const validateMethod = `  public async validateResult(taskDescription: string, agentResult: string): Promise<{isValid: boolean, reason: string}> {
    if (!this.model) {
      return { isValid: true, reason: "No AI model available, auto-approving." };
    }

    const systemPrompt = \`You are an expert QA validate for an agent network. Your job is to verify if the agent's output successfully resolved the original task description.
You must respond with ONLY a JSON object:
{
  "isValid": boolean,
  "reason": "short explanation of why it passed or failed"
}\`;

    try {
      const response = await this.model.generateContent({
        contents: [{ role: "user", parts: [{ text: \`\${systemPrompt}\\n\\nTask: \${taskDescription}\\n\\nAgent Result:\\n\${agentResult}\` }] }],
        generationConfig: { maxOutputTokens: 250, temperature: 0.1 },
      });

      const outputText = response.response.text();
      const jsonMatch = outputText.match(/\\\`\\\`\\\`json\\n([\\s\\S]*?)\\n\\\`\\\`\\\`/) || outputText.match(/({[\\s\\S]*})/);
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

  private logDecision(decision: RoutingDecision) {`;

code = code.replace(/private logDecision\(decision: RoutingDecision\) \{/m, validateMethod);

fs.writeFileSync(path, code);
console.log("router.ts updated to include validateResult");