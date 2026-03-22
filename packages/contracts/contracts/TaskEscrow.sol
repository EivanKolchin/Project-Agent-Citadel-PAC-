// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAgentRegistry {
    function updateReputation(address agent, bool success) external;
}

interface IReputationOracle {
    function incrementScore(address agent) external;
    function decrementScore(address agent) external;
}

contract TaskEscrow {
    enum TaskStatus { Open, Assigned, Completed, Failed, Disputed }

    struct Task {
        uint256 id;
        string description;
        address poster;
        address assignedAgent;
        uint256 bounty;
        uint256 deadline;
        TaskStatus status;
        string resultHash;
        uint256 createdAt;
    }

    uint256 public nextTaskId;
    mapping(uint256 => Task) public tasks;
    uint256[] public openTaskIds;

    address public routerAgent;
    IAgentRegistry public agentRegistry;
    IReputationOracle public reputationOracle;

    event TaskPosted(uint256 indexed taskId, string description, uint256 bounty);
    event TaskAssigned(uint256 indexed taskId, address indexed agentAddress);
    event TaskCompleted(uint256 indexed taskId, address indexed agentAddress, string resultHash);

    modifier onlyRouter() {
        require(msg.sender == routerAgent, "Only RouterAgent can assign");
        _;
    }

    constructor(address _agentRegistry, address _reputationOracle, address _routerAgent) {
        agentRegistry = IAgentRegistry(_agentRegistry);
        reputationOracle = IReputationOracle(_reputationOracle);
        routerAgent = _routerAgent;
    }

    function postTask(string memory description, uint256 deadline) external payable {
        require(msg.value > 0, "Bounty must be > 0");

        uint256 taskId = nextTaskId++;
        tasks[taskId] = Task({
            id: taskId,
            description: description,
            poster: msg.sender,
            assignedAgent: address(0),
            bounty: msg.value,
            deadline: deadline,
            status: TaskStatus.Open,
            resultHash: "",
            createdAt: block.timestamp
        });

        openTaskIds.push(taskId);
        emit TaskPosted(taskId, description, msg.value);
    }

    function assignTask(uint256 taskId, address agentAddress) external onlyRouter {
        Task storage task_ = tasks[taskId];
        require(task_.status == TaskStatus.Open, "Task not open");
        
        task_.assignedAgent = agentAddress;
        task_.status = TaskStatus.Assigned;

        // Remove from openTasks array
        for (uint i = 0; i < openTaskIds.length; i++) {
            if (openTaskIds[i] == taskId) {
                openTaskIds[i] = openTaskIds[openTaskIds.length - 1];
                openTaskIds.pop();
                break;
            }
        }

        emit TaskAssigned(taskId, agentAddress);
    }

    function submitResult(uint256 taskId, string memory resultHash) external {
        Task storage task_ = tasks[taskId];
        require(msg.sender == task_.assignedAgent, "Only assigned agent can submit result");
        require(task_.status == TaskStatus.Assigned, "Task not assigned to you");

        task_.resultHash = resultHash;
        task_.status = TaskStatus.Completed;

        emit TaskCompleted(taskId, msg.sender, resultHash);
    }

    function releasePayment(uint256 taskId) external {
        Task storage task_ = tasks[taskId];
        require(task_.status == TaskStatus.Completed, "Task not completed");
        require(msg.sender == task_.poster || msg.sender == routerAgent, "Only poster or router can release payment");

        uint256 amount = task_.bounty;
        task_.bounty = 0; // Protect against reentrancy

        // Update reputations first (CEI Pattern)
        agentRegistry.updateReputation(task_.assignedAgent, true);
        reputationOracle.incrementScore(task_.assignedAgent);

        payable(task_.assignedAgent).transfer(amount);
    }

    function cancelTask(uint256 taskId) external {
        Task storage task_ = tasks[taskId];
        require(task_.status == TaskStatus.Open, "Task not open");
        require(msg.sender == task_.poster, "Only poster can cancel");

        for (uint i = 0; i < openTaskIds.length; i++) {
            if (openTaskIds[i] == taskId) {
                openTaskIds[i] = openTaskIds[openTaskIds.length - 1];
                openTaskIds.pop();
                break;
            }
        }

        uint256 amount = task_.bounty;
        task_.bounty = 0;
        task_.status = TaskStatus.Failed;

        payable(msg.sender).transfer(amount);
    }

    function failTask(uint256 taskId) external onlyRouter {
        Task storage task_ = tasks[taskId];
        require(task_.status == TaskStatus.Assigned, "Task not assigned");

        uint256 amount = task_.bounty;
        task_.bounty = 0;
        task_.status = TaskStatus.Failed;

        agentRegistry.updateReputation(task_.assignedAgent, false);
        reputationOracle.decrementScore(task_.assignedAgent);

        payable(task_.poster).transfer(amount);
    }

    function disputeTask(uint256 taskId) external {
        Task storage task_ = tasks[taskId];
        require(task_.status == TaskStatus.Completed, "Task not completed");
        require(msg.sender == task_.poster, "Only poster can dispute");
        
        task_.status = TaskStatus.Disputed;
    }

    function resolveDispute(uint256 taskId, bool agentWins) external onlyRouter {
        Task storage task_ = tasks[taskId];
        require(task_.status == TaskStatus.Disputed, "Task not disputed");
        
        uint256 amount = task_.bounty;
        task_.bounty = 0;

        if (agentWins) {
            task_.status = TaskStatus.Completed;
            agentRegistry.updateReputation(task_.assignedAgent, true);
            reputationOracle.incrementScore(task_.assignedAgent);
            payable(task_.assignedAgent).transfer(amount);
        } else {
            task_.status = TaskStatus.Failed;
            agentRegistry.updateReputation(task_.assignedAgent, false);
            reputationOracle.decrementScore(task_.assignedAgent);
            payable(task_.poster).transfer(amount);
        }
    }

    function getTask(uint256 taskId) external view returns (Task memory) {
        return tasks[taskId];
    }

    function getOpenTasks() external view returns (Task[] memory) {
        Task[] memory open = new Task[](openTaskIds.length);
        for (uint i = 0; i < openTaskIds.length; i++) {
            open[i] = tasks[openTaskIds[i]];
        }
        return open;
    }
}
