const fs = require('fs');
const filePath = '../../packages/backend/src/index.ts';
let code = fs.readFileSync(filePath, 'utf-8');

const duplicateTarget = `app.post("/api/agents/register", async (req, res) => {
  res.status(501).json({ error: "Direct registration via backend proxy requires private key. Agents should register self via smart contract directly." });
});`;

if (code.includes(duplicateTarget)) {
  code = code.replace(duplicateTarget, '');
  fs.writeFileSync(filePath, code);
  console.log("Removed duplicate /api/agents/register");
} else {
  console.log("No duplicate found");
}
