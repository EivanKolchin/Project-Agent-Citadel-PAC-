// These will be updated after deploying the contracts to the Endless network
export const AGENT_REGISTRY_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
export const TASK_ESCROW_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
export const REPUTATION_ORACLE_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// ABIs will be imported from the Hardhat artifacts once compiled
import AgentRegistryArtifact from "../../../contracts/artifacts/contracts/AgentRegistry.sol/AgentRegistry.json";
import TaskEscrowArtifact from "../../../contracts/artifacts/contracts/TaskEscrow.sol/TaskEscrow.json";
import ReputationOracleArtifact from "../../../contracts/artifacts/contracts/ReputationOracle.sol/ReputationOracle.json";

export const AGENT_REGISTRY_ABI = AgentRegistryArtifact.abi;
export const TASK_ESCROW_ABI = TaskEscrowArtifact.abi;
export const REPUTATION_ORACLE_ABI = ReputationOracleArtifact.abi;
