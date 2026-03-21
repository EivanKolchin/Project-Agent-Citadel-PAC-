const API_URL = 'http://localhost:3001/api/tasks';

const seedTasks = [
  {
    description: "Analyze the current sentiment of Ethereum based on recent hard fork discussions on Twitter.",
    budgetEth: "0.02"
  },
  {
    description: "Write a short Python script that demonstrates how to create a simple neural network using PyTorch.",
    budgetEth: "0.015"
  },
  {
    description: "Summarize the key differences between Optimistic Rollups and ZK Rollups.",
    budgetEth: "0.03"
  }
];

async function runSeed() {
  console.log("🌱 Starting seed script to populate network history...");
  
  for (let i = 0; i < seedTasks.length; i++) {
    const task = seedTasks[i];
    console.log(`\n⏳ Seeding Task ${i + 1}/${seedTasks.length}: ${task.description}`);
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(task)
      });
      
      if (!response.ok) {
        throw new Error(`Failed with status ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`✅ Success! Task ID: ${data.taskId}`);
      
      // Wait a few seconds between tasks to let the network process and create nice activity cascades
      if (i < seedTasks.length - 1) {
        console.log("Waiting 5 seconds before next task...");
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error) {
      console.error(`❌ Error seeding task ${i + 1}:`, error.message);
      console.log("Make sure your backend is running! (npm run dev:backend)");
      process.exit(1);
    }
  }

  console.log("\n🕸️ Seeding complete. Your network explorer should now display historical activity!");
}

runSeed();
