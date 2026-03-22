const fs = require('fs');
const path = 'packages/frontend/src/pages/Agents.tsx';
let code = fs.readFileSync(path, 'utf8');

const importReplacement = `import { useApp } from '../context/WebSocketContext';
import { useState } from 'react';
import { LuffaSDK } from '../lib/luffa';
import { Interface, Contract } from 'ethers';
import { useEthPrice } from '../hooks/useEthPrice';
import { AgentLeaderboard } from '../components/AgentLeaderboard';
import { useWallet } from '../context/WalletContext';`;

code = code.replace(/import \{ useApp \} from '\.\.\/context\/WebSocketContext';\r?\nimport \{ useState \} from 'react';\r?\nimport \{ LuffaSDK \} from '\.\.\/lib\/luffa';\r?\nimport \{ Interface \} from 'ethers';\r?\nimport \{ useEthPrice \} from '\.\.\/hooks\/useEthPrice';\r?\nimport \{ AgentLeaderboard \} from '\.\.\/components\/AgentLeaderboard';/, importReplacement);

const hookReplacement = `export const Agents = () => {
  const { agents, isLoading, config } = useApp();
  const { address, signer } = useWallet();
  const { formatUsd } = useEthPrice();`;

code = code.replace(/export const Agents = \(\) => \{\r?\n\s*const \{ agents, isLoading, config \} = useApp\(\);\r?\n\s*const \{ formatUsd \} = useEthPrice\(\);/, hookReplacement);

const abiReplacement = `const AGENT_REGISTRY_ABI = [
  "function registerAgent(string name, string description, string endpoint, string[] capabilities) payable",
  "function deregisterAgent()"
];`;

code = code.replace(/const AGENT_REGISTRY_ABI = \[\r?\n\s*"function registerAgent[^\]]*"\r?\n\];/, abiReplacement);


const functionReplacement = `  const handleDeregister = async () => {
    if (!signer || !config.AGENT_REGISTRY_ADDRESS) return;
    try {
      const contract = new Contract(config.AGENT_REGISTRY_ADDRESS, AGENT_REGISTRY_ABI, signer);
      const tx = await contract.deregisterAgent();
      await tx.wait();
      setRegStatus('Successfully deregistered and unstaked.');
      setTimeout(() => setRegStatus(''), 3000);
    } catch(e: any) {
      setRegStatus(\`Error: \${e.message}\`);
      setTimeout(() => setRegStatus(''), 3000);
    }
  };

  const handleRegister = async () => {`;

code = code.replace(/const handleRegister = async \(\) => \{/, functionReplacement);

const cardReplacement = `            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-medium text-lg text-white group-hover:text-zinc-200 transition-colors">{agent.name}</h3>
                <p className="text-xs font-mono text-zinc-500 mt-1">{agent.address.slice(0, 6)}...{agent.address.slice(-4)}</p>
              </div>
              <div className="flex flex-col items-end space-y-2">
                <span className={\`text-[9px] px-2 py-0.5 rounded-full border uppercase font-semibold tracking-wider \${agent.currentStatus === 'offline' ? 'bg-red-500/10 text-red-500 border-red-500/20' : agent.currentStatus === 'idle' ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}\`}>
                  {agent.currentStatus || 'idle'}
                </span>
                {address && agent.address.toLowerCase() === address.toLowerCase() && (
                  <button onClick={(e) => { e.stopPropagation(); handleDeregister(); }} className="text-[9px] px-2 py-0.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full hover:bg-red-500/20 transition-all uppercase tracking-wider font-bold">Unstake</button>
                )}
              </div>
            </div>`;

code = code.replace(/<div className="flex justify-between items-start mb-3">[\s\S]*?<\/span>\r?\n\s*<\/div>/, cardReplacement);

fs.writeFileSync(path, code);
console.log("Agents.tsx updated with Deregister capability");