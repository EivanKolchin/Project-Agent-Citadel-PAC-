import { ethers } from "hardhat";

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
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
