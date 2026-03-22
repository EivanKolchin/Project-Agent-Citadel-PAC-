const fs = require('fs');

const FILE_PATH = 'packages/frontend/src/pages/Agents.tsx';
let content = fs.readFileSync(FILE_PATH, 'utf-8');

// Replace imports
content = content.replace(
  `import { useEthPrice } from '../hooks/useEthPrice';`,
  `import { useEthPrice } from '../hooks/useEthPrice';\nimport { Contract } from 'ethers';\nimport { useWallet } from '../context/WalletContext';\nimport { AgentLeaderboard } from '../components/AgentLeaderboard';\n`
);

// Add state and deregulation handler
content = content.replace(
  `const { agents, isLoading, config } = useApp();`,
  `const { agents, isLoading, config } = useApp();\n  const { signer } = useWallet();`
);

const handleDeregister = `
  const handleDeregister = async (agentAddress: string) => {
    if (!config.AGENT_REGISTRY_ADDRESS || !signer) {
      setRegStatus('Error: Wallet not connected or contract unknown.');
      setTimeout(() => setRegStatus(''), 3000);
      return;
    }
    try {
      setRegStatus('Deregistering Agent...');
      const contract = new Contract(config.AGENT_REGISTRY_ADDRESS, ["function deregisterAgent()"], signer);
      const tx = await contract.deregisterAgent();
      await tx.wait();
      setRegStatus('Agent Deregistered!');
      setTimeout(() => setRegStatus(''), 3000);
    } catch (e: any) {
      setRegStatus(\`Error: \${e.message}\`);
      setTimeout(() => setRegStatus(''), 3000);
    }
  };
`;

content = content.replace(
  `const filtered = agents.filter(a => !filter || a.capabilities.some((c: string) => c.toLowerCase().includes(filter.toLowerCase())));`,
  `const filtered = agents.filter(a => !filter || a.capabilities.some((c: string) => c.toLowerCase().includes(filter.toLowerCase())));\n${handleDeregister}`
);

// Fix the return structure. Wait, I should replace exactly what was in the agent item.
const searchStr = `
            <div className="mt-auto pt-6">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-zinc-500 font-medium">Reputation / Oracle</span>
                <span className="text-white font-medium">{agent.reputationScore} / {(agent as any).oracleScore || 0}</span>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
                <div className="bg-white h-full rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" style={{ width: \`\${Math.min(100, agent.reputationScore)}%\` }} />
              </div>
              <p className="text-right text-[10px] text-zinc-600 mt-2 font-mono uppercase tracking-widest">{agent.tasksCompleted} Tasks Completed</p>
            </div>
          </div>
        ))}
        {!isLoading && filtered.length === 0 && <p className="text-zinc-500 col-span-full font-light text-center py-10">No agents found matching capabilities.</p>}
      </div>
    </div>
  );
};`;

const replaceStr = `
            <div className="mt-auto pt-6 flex flex-col gap-4">
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-zinc-500 font-medium">Reputation / Oracle</span>
                  <span className="text-white font-medium">{agent.reputationScore} / {(agent as any).oracleScore || 0}</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
                  <div className="bg-white h-full rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" style={{ width: \`\${Math.min(100, agent.reputationScore)}%\` }} />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <button onClick={() => handleDeregister(agent.address)} className="text-[10px] bg-red-500/10 text-red-500 hover:bg-red-500/20 px-2 py-1 rounded transition-colors uppercase tracking-wider font-semibold">Unstake</button>
                  <p className="text-right text-[10px] text-zinc-600 font-mono uppercase tracking-widest">{agent.tasksCompleted} Tasks Completed</p>
                </div>
              </div>
            </div>
          </div>
        ))}
        {!isLoading && filtered.length === 0 && <p className="text-zinc-500 col-span-full font-light text-center py-10">No agents found matching capabilities.</p>}
      </div>
      <AgentLeaderboard agents={agents} />
    </div>
  );
};`;

content = content.replace(searchStr.trim(), replaceStr.trim());

// Also remove duplicate state variables
content = content.replace(`const [showCustomReg, setShowCustomReg] = useState(false);\n  const [customUid, setCustomUid] = useState('');\n  const [customSecret, setCustomSecret] = useState('');\n  const [customName, setCustomName] = useState('');\n  const [customCaps, setCustomCaps] = useState('general,chat');`, '');

fs.writeFileSync(FILE_PATH, content);
console.log("Patched correctly");
