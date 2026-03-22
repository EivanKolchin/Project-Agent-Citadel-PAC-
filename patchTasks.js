const fs = require('fs');
const path = 'packages/frontend/src/pages/Tasks.tsx';
let code = fs.readFileSync(path, 'utf8');

const importReplacement = `import { useApp } from '../context/WebSocketContext';
import { useState } from 'react';
import { LuffaSDK } from '../lib/luffa';
import { Interface, Contract } from 'ethers';
import { useEthPrice } from '../hooks/useEthPrice';
import { useWallet } from '../context/WalletContext';`;

code = code.replace(/import \{ useApp \} from '\.\.\/context\/WebSocketContext';\r?\nimport \{ useState \} from 'react';\r?\nimport \{ LuffaSDK \} from '\.\.\/lib\/luffa';\r?\nimport \{ Interface \} from 'ethers';\r?\nimport \{ useEthPrice \} from '\.\.\/hooks\/useEthPrice';/, importReplacement);

const abiReplacement = `const TASK_ESCROW_ABI = [
  "function postTask(string description, uint256 deadline) payable",
  "function cancelTask(uint256 taskId)",
  "function disputeTask(uint256 taskId)"
];`;

code = code.replace(/const TASK_ESCROW_ABI = \[\r?\n\s*"function postTask\(string description, uint256 deadline\) payable"\r?\n\];/, abiReplacement);

const hookReplacement = `export const Tasks = () => {
  const { tasks, agents, isLoading, config } = useApp();
  const { address, signer } = useWallet();
  const { formatUsd } = useEthPrice();`;

code = code.replace(/export const Tasks = \(\) => \{\r?\n\s*const \{ tasks, agents, isLoading, config \} = useApp\(\);\r?\n\s*const \{ formatUsd \} = useEthPrice\(\);/, hookReplacement);

const functionReplacement = `  const handleAction = async (action: 'cancel' | 'dispute', taskId: string) => {
    if (!signer || !config.TASK_ESCROW_ADDRESS) {
      setErrorMessage("Wallet not connected or contracts not loaded");
      return;
    }
    try {
      const contract = new Contract(config.TASK_ESCROW_ADDRESS, TASK_ESCROW_ABI, signer);
      if (action === 'cancel') {
        const tx = await contract.cancelTask(taskId);
        await tx.wait();
      } else if (action === 'dispute') {
        const tx = await contract.disputeTask(taskId);
        await tx.wait();
      }
    } catch(err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Transaction failed');
    }
  };

  const statusMessages: Record<number, string> = {`;

code = code.replace(/const statusMessages: Record<number, string> = \{/, functionReplacement);

const theadReplacement = `              <th className="p-5 font-medium tracking-wide">Status</th>
              <th className="p-5 font-medium tracking-wide hidden sm:table-cell">Assigned Agent</th>
              <th className="p-5 font-medium tracking-wide text-right">Actions</th>`;

code = code.replace(/<th className="p-5 font-medium tracking-wide">Status<\/th>\r?\n\s*<th className="p-5 font-medium tracking-wide hidden sm:table-cell">Assigned Agent<\/th>/, theadReplacement);

const tbodyReplacement = `                <td className="p-5 text-zinc-400 text-xs hidden sm:table-cell font-mono">
                  {formatAssignee(t)}
                </td>
                <td className="p-5 text-right">
                  {t.poster && address && t.poster.toLowerCase() === address.toLowerCase() ? (
                    t.status === 'open' ? (
                      <button onClick={(e) => { e.stopPropagation(); handleAction('cancel', t.id); }} className="text-[10px] px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded hover:bg-red-500/20 transition-all uppercase tracking-wider font-bold">Cancel</button>
                    ) : t.status === 'completed' ? (
                      <button onClick={(e) => { e.stopPropagation(); handleAction('dispute', t.id); }} className="text-[10px] px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded hover:bg-purple-500/20 transition-all uppercase tracking-wider font-bold">Dispute</button>
                    ) : null
                  ) : null}
                </td>
              </tr>`;

code = code.replace(/<td className="p-5 text-zinc-400 text-xs hidden sm:table-cell font-mono">\r?\n\s*\{formatAssignee\(t\)\}\r?\n\s*<\/td>\r?\n\s*<\/tr>/, tbodyReplacement);

fs.writeFileSync(path, code);
console.log("Tasks.tsx updated with Cancel/Dispute capabilities");