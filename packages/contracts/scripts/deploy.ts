import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { DEMO_LUFFA_BOTS_FOR_DEPLOY } from "../../backend/src/config/demoBots";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 1. Deploy ReputationOracle
  const ReputationOracle = await ethers.getContractFactory("ReputationOracle");
  const reputationOracle = await ReputationOracle.deploy();
  await reputationOracle.waitForDeployment();
  const reputationOracleAddress = await reputationOracle.getAddress();
  console.log("ReputationOracle deployed to:", reputationOracleAddress);

  // 2. Deploy AgentRegistry
  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy();
  await agentRegistry.waitForDeployment();
  const agentRegistryAddress = await agentRegistry.getAddress();
  console.log("AgentRegistry deployed to:", agentRegistryAddress);

  // 3. Deploy TaskEscrow
  // Note: We use the deployer's address as a placeholder for the routerAgent for demonstration
  const routerAgentAddress = deployer.address;
  const TaskEscrow = await ethers.getContractFactory("TaskEscrow");
  const taskEscrow = await TaskEscrow.deploy(
    agentRegistryAddress,
    reputationOracleAddress,
    routerAgentAddress
  );
  await taskEscrow.waitForDeployment();
  const taskEscrowAddress = await taskEscrow.getAddress();
  console.log("TaskEscrow deployed to:", taskEscrowAddress);

  // 4. Set the TaskEscrow addresses on the newly deployed contracts so it has permission to update reputation
  console.log("Configuring cross-contract permissions...");
  
  const setEscrowTx1 = await reputationOracle.setTaskEscrow(taskEscrowAddress);
  await setEscrowTx1.wait();
  console.log("  - TaskEscrow configured in ReputationOracle");

  const setEscrowTx2 = await agentRegistry.setTaskEscrow(taskEscrowAddress);
  await setEscrowTx2.wait();
  console.log("  - TaskEscrow configured in AgentRegistry");

  console.log("\nAll Smart Contracts have been deployed successfully!");

  // 5. Write the addresses to the backend config file
  console.log("Updating backend contract addresses...");
  const backendConfigPath = path.join(__dirname, "../../backend/src/config/contracts.ts");
  let backendConfigConfig = fs.readFileSync(backendConfigPath, "utf8");

  backendConfigConfig = backendConfigConfig.replace(
    /export const AGENT_REGISTRY_ADDRESS = ".*";/,
    `export const AGENT_REGISTRY_ADDRESS = "${agentRegistryAddress}";`
  );
  backendConfigConfig = backendConfigConfig.replace(
    /export const TASK_ESCROW_ADDRESS = ".*";/,
    `export const TASK_ESCROW_ADDRESS = "${taskEscrowAddress}";`
  );
  backendConfigConfig = backendConfigConfig.replace(
    /export const REPUTATION_ORACLE_ADDRESS = ".*";/,
    `export const REPUTATION_ORACLE_ADDRESS = "${reputationOracleAddress}";`
  );

  fs.writeFileSync(backendConfigPath, backendConfigConfig);
  console.log("Backend contracts configuration updated!");

  // 6. Pre-Register the Luffa Worker Bots automatically!
  console.log("\nRegistering Luffa Bot Identities to Blockchain Mock...");
  const bots = DEMO_LUFFA_BOTS_FOR_DEPLOY.map((b) => ({ ...b, caps: [...b.caps] }));

  // Create sub-wallets to act as the agent addresses via Hardhat's secondary signers
  const signers = await ethers.getSigners();

  for (let i = 0; i < bots.length; i++) {
    const bot = bots[i];
    const botWallet = signers[i + 1]; // Offset by 1 to skip deployer
    const botRegistry = agentRegistry.connect(botWallet) as any;
    
    // The endpoint points back to our own backend Luffa proxy! 
    const endpoint = `http://localhost:3001/api/luffa/${bot.uid}`;
    
    // Call the AgentRegistry contract directly!
    const tx = await botRegistry.registerAgent(
      bot.name,
      `${bot.name} powered by Luffa API`,
      endpoint,
      bot.caps,
      { value: ethers.parseEther("0.01") }
    );
    await tx.wait();
    console.log(`  - Registered ${bot.name} at ${botWallet.address}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

