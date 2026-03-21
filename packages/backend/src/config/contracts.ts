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
  "event AgentRegistered(address indexed agent, string name, string[] capabilities)",
  "function getAllAgents() view returns (tuple(address wallet, string name, string description, string endpoint, string[] capabilities, uint256 reputationScore, uint256 tasksCompleted, uint256 stakedAmount, bool active)[])"
] as any[];
export const TASK_ESCROW_ABI = [
  "event TaskPosted(uint256 indexed taskId, string description, uint256 bounty)",
  "event TaskAssigned(uint256 indexed taskId, address indexed agentAddress)",
  "event TaskCompleted(uint256 indexed taskId, address indexed agentAddress, string resultHash)",
  "function nextTaskId() view returns (uint256)",
  "function tasks(uint256) view returns (tuple(uint256 id, string description, address poster, address assignedAgent, uint256 bounty, uint256 deadline, uint8 status, string resultHash, uint256 createdAt))",
  "function getOpenTasks() view returns (tuple(uint256 id, string description, address poster, address assignedAgent, uint256 bounty, uint256 deadline, uint8 status, string resultHash, uint256 createdAt)[])",
  "function postTask(string description, uint256 deadline) payable",
  "function assignTask(uint256 taskId, address agentAddress)",
  "function submitResult(uint256 taskId, string resultHash)",
  "function releasePayment(uint256 taskId)"
] as any[];
export const REPUTATION_ORACLE_ABI = [] as any[];
