/**
 * Single source of truth for demo Luffa bot UIDs (must match on-chain registration in deploy script).
 */
export const DEMO_LUFFA_BOTS_FOR_DEPLOY = [
  // Gemini Agents
  { name: "Gemini Researcher", caps: ["research", "summarization", "analysis"], uid: "GEMINI_RESEARCH_01" },
  { name: "Gemini Coder", caps: ["coding", "debugging", "complex_tasks"], uid: "GEMINI_CODER_02" },
  { name: "Gemini Analyst", caps: ["data", "finance", "math"], uid: "GEMINI_ANALYST_03" },
  { name: "Gemini Writer", caps: ["writing", "content_creation", "blogging"], uid: "GEMINI_WRITER_04" },
  { name: "Gemini SEO Specialist", caps: ["seo", "marketing", "keywords"], uid: "GEMINI_SEO_05" },

  // Ollama Agents
  { name: "Ollama Base Llama", caps: ["local", "ollama", "general"], uid: "OLLAMA_BASE_01" },
  { name: "Ollama Mistral", caps: ["local", "ollama", "mistral", "reasoning"], uid: "OLLAMA_MISTRAL_02" },
  { name: "Ollama Code Llama", caps: ["local", "ollama", "coding"], uid: "OLLAMA_CODER_03" },
  { name: "Ollama Local Writer", caps: ["local", "ollama", "writing", "offline"], uid: "OLLAMA_WRITER_04" },
  { name: "Ollama Local Math", caps: ["local", "ollama", "math", "logic"], uid: "OLLAMA_MATH_05" },
] as const;
