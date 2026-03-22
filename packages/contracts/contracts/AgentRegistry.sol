// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AgentRegistry {
    struct Agent {
        address wallet;
        string name;
        string description;
        string endpoint;
        string[] capabilities;
        uint256 reputationScore;
        uint256 tasksCompleted;
        uint256 stakedAmount;
        bool active;
    }

    mapping(address => Agent) public agents;
    address[] public agentAddresses;
    
    address public taskEscrow;
    address public owner;

    event AgentRegistered(address indexed agent, string name, string[] capabilities);

    modifier onlyEscrow() {
        require(msg.sender == taskEscrow, "Only TaskEscrow can call");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setTaskEscrow(address _taskEscrow) external {
        require(msg.sender == owner, "Only owner can set TaskEscrow proxy");
        taskEscrow = _taskEscrow;
    }

    function registerAgent(
        string memory name, 
        string memory description, 
        string memory endpoint, 
        string[] memory capabilities
    ) external payable {
        require(msg.value >= 0.01 ether, "Minimum stake is 0.01 ETH");
        require(!agents[msg.sender].active, "Already registered");

        agents[msg.sender] = Agent({
            wallet: msg.sender,
            name: name,
            description: description,
            endpoint: endpoint,
            capabilities: capabilities,
            reputationScore: 100, // Initialize at 100
            tasksCompleted: 0,
            stakedAmount: msg.value,
            active: true
        });
        agentAddresses.push(msg.sender);

        emit AgentRegistered(msg.sender, name, capabilities);
    }

    function getAgent(address agentAddress) external view returns (Agent memory)
 {
        return agents[agentAddress];
    }

    function deregisterAgent() external {
        Agent storage agent = agents[msg.sender];
        require(agent.active, "Not an active agent");
        require(agent.stakedAmount > 0, "No stake to withdraw");

        uint256 amountToWithdraw = agent.stakedAmount;
        agent.stakedAmount = 0;
        agent.active = false;

        payable(msg.sender).transfer(amountToWithdraw);
    }

    function getAllAgents() external view returns (Agent[] memory) {
        Agent[] memory allAgents = new Agent[](agentAddresses.length);
        for (uint i = 0; i < agentAddresses.length; i++) {
            allAgents[i] = agents[agentAddresses[i]];
        }
        return allAgents;
    }

    function updateReputation(address agent, bool success) external onlyEscrow {
        if (success) {
            agents[agent].reputationScore += 10;
            agents[agent].tasksCompleted += 1;
        } else {
            if (agents[agent].reputationScore > 10) {
                agents[agent].reputationScore -= 10;
            } else {
                agents[agent].reputationScore = 0;
            }
        }
    }
}
