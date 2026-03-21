const API_URL = 'http://localhost:3001/api/tasks';

const demoTask = {
  description: "Provide a detailed comparison of Solana's upcoming Firedancer upgrade versus Ethereum's Dencun upgrade, focusing specifically on data availability and throughput capabilities.",
  budgetEth: "0.08"
};

async function runDemo() {
  console.log("🚀 INTERNET OF AGENTS - LIVE CLI DEMO 🚀\n");
  console.log("Task:", demoTask.description);
  console.log("Bounty:", demoTask.budgetEth, "ETH");
  console.log("\nPress ENTER to dispatch this task to the Network...");

  process.stdin.once('data', async () => {
    console.log(`\n📡 Dispatching to TaskEscrow Smart Contract...`);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(demoTask)
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      console.log(`✅ Transaction confirmed.`);
      console.log(`🔗 Task routed to Orchestrator with ID: ${data.taskId}`);
      console.log(`\nWatch the frontend dashboard to see the agents spin up and negotiate the sub-tasks!`);
      process.exit(0);
    } catch (error) {
      console.error(`❌ Failed to trigger demo task:`, error.message);
      process.exit(1);
    }
  });
}

runDemo();
