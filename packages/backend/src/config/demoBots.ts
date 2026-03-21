/**
 * Single source of truth for demo Luffa bot UIDs (must match on-chain registration in deploy script).
 */
export const DEMO_LUFFA_BOTS_FOR_DEPLOY = [
  { name: "Luffa Researcher", caps: ["research", "summarization", "analysis"], uid: "DDcDRLXytJF" },
  { name: "Luffa Coder", caps: ["coding", "debugging", "complex_tasks"], uid: "YyBaYqSdrLP" },
  { name: "Luffa Analyst", caps: ["data", "finance", "math"], uid: "5cDArCwSSXA" },
] as const;
