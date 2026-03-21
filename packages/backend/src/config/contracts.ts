// These will be updated after deploying the contracts to the Endless network
export const AGENT_REGISTRY_ADDRESS = "0x0165878A594ca255338adfa4d48449f69242Eb8F";
export const TASK_ESCROW_ADDRESS = "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";
export const REPUTATION_ORACLE_ADDRESS = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

// ABIs will be imported from the Hardhat artifacts once compiled
// import AgentRegistryArtifact from "../../../contracts/artifacts/contracts/AgentRegistry.sol/AgentRegistry.json";
// import TaskEscrowArtifact from "../../../contracts/artifacts/contracts/TaskEscrow.sol/TaskEscrow.json";
// import ReputationOracleArtifact from "../../../contracts/artifacts/contracts/ReputationOracle.sol/ReputationOracle.json";

// export const AGENT_REGISTRY_ABI = AgentRegistryArtifact.abi;
// export const TASK_ESCROW_ABI = TaskEscrowArtifact.abi;
// export const REPUTATION_ORACLE_ABI = ReputationOracleArtifact.abi;

export const AGENT_REGISTRY_ABI = [
  "event AgentRegistered(address indexed agent, string name, string capabilities)",
  "function getAllAgents() view returns (tuple(address agentAddress, string name, string capabilities, bool isActive)[])"
] as any[];
export const TASK_ESCROW_ABI = [
  "event TaskPosted(uint256 indexed taskId, string description, uint256 bounty)",
  "event TaskAssigned(uint256 indexed taskId, address indexed agentAddress)",
  "event TaskCompleted(uint256 indexed taskId, address indexed agentAddress, string resultHash)"
] as any[];
export const REPUTATION_ORACLE_ABI = [] as any[];
