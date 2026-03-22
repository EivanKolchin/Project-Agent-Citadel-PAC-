const fs = require('fs');

const path = 'packages/contracts/contracts/TaskEscrow.sol';
let code = fs.readFileSync(path, 'utf8');

const replacement = `function releasePayment(uint256 taskId) external {
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
    }`;

// Replace the original releasePayment block with the new methods
code = code.replace(/function releasePayment\([\s\S]*?reputationOracle\.incrementScore\(task_\.assignedAgent\);\r?\n\s*\}/m, replacement);

fs.writeFileSync(path, code);
console.log("TaskEscrow.sol updated.");