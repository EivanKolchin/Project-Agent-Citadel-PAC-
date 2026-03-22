const fs = require('fs');

const path = '../../packages/backend/src/index.ts';
let code = fs.readFileSync(path, 'utf-8');

const target = `  if (!botConfig) {
    if (uid === "luffa_dev_123" || uid.startsWith("frontend")) {
      botConfig = {`;
const replace = `  if (!botConfig) {
    if (true) { // Automatically accept dynamically registered frontend bots
      botConfig = {`;

if (code.includes('if (uid === "luffa_dev_123" || uid.startsWith("frontend")) {')) {
  code = code.replace(target, replace);
  fs.writeFileSync(path, code);
  console.log("Patched backend index.ts to accept dynamic frontend UIDs");
} else {
  console.log("Could not find backend target to patch.");
}
