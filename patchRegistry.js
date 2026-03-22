const fs = require('fs');

const path = 'packages/contracts/contracts/AgentRegistry.sol';
let code = fs.readFileSync(path, 'utf8');

const replacement = `function getAgent(address agentAddress) external view returns (Agent memory)
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

    function getAllAgents()`;

code = code.replace(/function getAgent\([\s\S]*?function getAllAgents\(\)/m, replacement);
fs.writeFileSync(path, code);
console.log("AgentRegistry.sol updated");