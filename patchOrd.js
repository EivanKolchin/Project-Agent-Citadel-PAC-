const fs = require('fs');
const path = 'packages/backend/src/orchestrator.ts';
let code = fs.readFileSync(path, 'utf8');

const replacement = `      const resultHash = crypto.createHash("sha256").update(finalResult.content).digest("hex");
      this.eventEmitter.emit("activity", { type: "system", message: \`Task \${taskId} complete. Running QA Validation...\` });

      // Run QA Validation Step
      const validation = await this.router.validateResult(cleanDescription, finalResult.content);
      if (!validation.isValid) {
         this.eventEmitter.emit("activity", { type: "error", message: \`Task \${taskId} failed validation: \${validation.reason}\` });
         // Trigger Task failure on chain here theoretically, but let's just abort for now
         throw new Error(\`Agent failed QA Validation: \${validation.reason}\`);
      }

      this.eventEmitter.emit("activity", { type: "system", message: \`Task \${taskId} passed QA. Submitting hash: \${resultHash.substring(0, 10)}...\` });

      await withRetry(() => this.blockchain.submitResult(taskId, resultHash, assignedAgent), 1, 1500, "Blockchain Submit Result");`;

code = code.replace(/const resultHash = crypto\.createHash\("sha256"\)\.update\(finalResult\.content\)\.digest\("hex"\);\s*this\.eventEmitter\.emit\("activity", \{ type: "system", message: `Task \$\{taskId\} complete\. Submitting hash: \$\{resultHash\.substring\(0, 10\)\}\.\.\.` \}\);\s*await withRetry\(\(\) => this\.blockchain\.submitResult\(taskId, resultHash, assignedAgent\), 1, 1500, "Blockchain Submit Result"\);/m, replacement);

fs.writeFileSync(path, code);
console.log("orchestrator.ts updated with QA step");