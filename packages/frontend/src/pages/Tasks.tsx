import { useApp } from '../context/WebSocketContext';
import { useState } from 'react';
import { LuffaSDK } from '../lib/luffa';
import { Interface, Contract, ethers } from 'ethers';
import { useEthPrice } from '../hooks/useEthPrice';
import { useWallet } from '../context/WalletContext';
import { InfoTooltip } from '../components/InfoTooltip';

const TASK_ESCROW_ABI = [
  "function postTask(string description, uint256 deadline) payable",
  "function cancelTask(uint256 taskId)",
  "function disputeTask(uint256 taskId)"
];

function formatAssignee(t: any): string {
  const addr = t.assignedAgent;
  if (typeof addr === 'string' && addr.startsWith('0x') && addr.length >= 10) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }
  if (t.assignedAgentName) return t.assignedAgentName;
  if (addr) return String(addr);
  return 'Waiting...';
}

export const Tasks = () => {
  const { tasks, agents, isLoading, config } = useApp();
  const { address, signer } = useWallet();
  const { formatUsd } = useEthPrice();
  const [isModalOpen, setModalOpen] = useState(false);
  const [desc, setDesc] = useState('');
  const [budget, setBudget] = useState('0.05');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState(0); 
  const [errorMessage, setErrorMessage] = useState('');
  const [showMyTasks, setShowMyTasks] = useState(false);
  
  // Routing preferences
  const [routingMode, setRoutingMode] = useState<'auto' | 'manual'>('auto');
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [agentSearch, setAgentSearch] = useState('');

  const filteredAgents = agents.filter(a => 
    a.name.toLowerCase().includes(agentSearch.toLowerCase()) || 
    a.capabilities.some((c: string) => c.toLowerCase().includes(agentSearch.toLowerCase()))
  );
  
  const displayedTasks = tasks.filter(t => !showMyTasks || (address && t.poster?.toLowerCase() === address.toLowerCase()));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!desc || !budget) return;
    
    const parsedBudget = parseFloat(budget);
    if (isNaN(parsedBudget) || parsedBudget <= 0) {
      setErrorMessage("Bounty must be greater than 0.");
      return;
    }

    if(routingMode === 'manual' && !selectedAgent) {
      setErrorMessage("Please select an agent for manual routing.");
      return;
    }
    
    setIsDeploying(true);
    setDeployStep(1); // Starting
    setErrorMessage('');
    
    try {
      // Step 1
      await new Promise(r => setTimeout(r, 500));
      setDeployStep(2);
      
      const finalizeDesc = routingMode === 'manual' ? `[TARGET:${selectedAgent}] ${desc}` : desc;

      // Step 2
      // Using ethers Interface to encode the function call data
      if (!config.TASK_ESCROW_ADDRESS) throw new Error("Smart Contracts not synced. Ensure backend node is running.");
      const iface = new Interface(TASK_ESCROW_ABI);
      const data = iface.encodeFunctionData("postTask", [
        finalizeDesc, 
        Math.floor(Date.now() / 1000) + 86400 // 24-hour deadline
      ]) as string;

let txHash = '';
      if (signer) {
        setDeployStep(2); // Provide visual feedback for wallet
        const txResp = await signer.sendTransaction({
          to: config.TASK_ESCROW_ADDRESS,
          value: ethers.parseEther(budget),
          data: data
        });
        txHash = txResp.hash;
        await txResp.wait();
      } else {
        txHash = await LuffaSDK.signTransaction({
          to: config.TASK_ESCROW_ADDRESS, // Real Escrow Contract Address
          value: budget,
          data: data
        });
      }
      
      setDeployStep(3); // "Transaction confirmed. Routing Task to Network..."
      
      // Step 3 (Removed API call)
      // The frontend now fully relies on the Hardhat local node's TaskPosted event
      // passing the notification cleanly back through the websocket to orchestrate!
      
      setDeployStep(4); // Finished
      setTimeout(() => {
        setModalOpen(false);
        setDesc('');
        setRoutingMode('auto');
        setSelectedAgent('');
        setIsDeploying(false);
        setDeployStep(0);
      }, 2500);

    } catch (err: any) {
      console.error(err);
      
      // Handle the 503 Backend/Blockchain connection error 
      if (err.response && err.response.status === 503) {
        setErrorMessage("Blockchain RPC Disconnected. Please ensure 'npm run node -w contracts' is running locally!");
      } else {
        setErrorMessage(err.message || 'Transaction failed or rejected.');
      }
      
      setDeployStep(-1); // Error
      setIsDeploying(false);
    }
  };

    const handleAction = async (action: 'cancel' | 'dispute', taskId: string) => {
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

  const statusMessages: Record<number, string> = {
    [-1]: errorMessage || 'Error deploying task. Try again.',
    0: '',
    1: 'Connecting to Luffa Wallet...',
    2: 'Awaiting Transaction Signature...',
    3: 'Transaction confirmed. Routing Task to Network...',
    4: 'Task Deployed Successfully!'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Task Ledger</h1>
            <InfoTooltip text="Browse pending network tasks waiting for AI execution. All funds are held securely in Web3 escrow until job completion." />
          </div>
          <p className="text-slate-400 text-sm">Escrow-backed agent jobs across the network.</p>
        </div>
        <div className="flex gap-4">
          <button
             onClick={() => setShowMyTasks(!showMyTasks)}
             className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg ${showMyTasks ? 'bg-indigo-600 text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}
          >
             {showMyTasks ? 'Showing My Tasks' : 'My Tasks'}
          </button>
          <button 
            onClick={() => setModalOpen(true)}
            className="bg-white text-black hover:bg-zinc-200 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg"
          >
            Post Task
          </button>
        </div>
      </div>

      <div className="bg-zinc-900/40 border border-white/5 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/5 text-zinc-400">
              <th className="p-5 font-medium tracking-wide">Task</th>
              <th className="p-5 font-medium tracking-wide">Bounty (ETH)</th>
                            <th className="p-5 font-medium tracking-wide">Status</th>
              <th className="p-5 font-medium tracking-wide hidden sm:table-cell">Assigned Agent</th>
              <th className="p-5 font-medium tracking-wide text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              [1,2,3].map(i => (
                <tr key={i} className="animate-pulse bg-white/[0.01]">
                  <td className="p-5"><div className="h-4 bg-white/5 rounded w-3/4 mb-2"></div><div className="h-3 bg-white/5 rounded w-1/4"></div></td>
                  <td className="p-5"><div className="h-4 bg-white/5 rounded w-16"></div></td>
                  <td className="p-5"><div className="h-6 bg-white/5 rounded w-20"></div></td>
                  <td className="p-5 hidden sm:table-cell"><div className="h-4 bg-white/5 rounded w-24"></div></td>
                </tr>
              ))
            ) : displayedTasks.map((t, i) => (
              <tr key={t.id || i} className="hover:bg-white/[0.02] transition-colors cursor-pointer group">
                <td className="p-5">
                  <p className="text-zinc-200 font-medium line-clamp-1 max-w-[300px]">{t.description}</p>
                  <span className="text-[10px] text-zinc-500 font-mono mt-1 block">ID: {t.id}</span>
                </td>
                <td className="p-5 text-white font-light">
                  {t.bounty} 
                  <span className="block text-[10px] text-zinc-500 mt-0.5">{formatUsd(t.bounty)}</span>
                </td>
                <td className="p-5">
                  <span className={`text-[10px] px-2.5 py-1 rounded-full border uppercase tracking-wider font-semibold 
                    ${t.status === 'open' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                      t.status === 'assigned' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                    {t.status}
                  </span>
                </td>
                                <td className="p-5 text-zinc-400 text-xs hidden sm:table-cell font-mono">
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
              </tr>
            ))}
            {!isLoading && displayedTasks.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-zinc-500 font-light">The escrow ledger is empty.</td></tr>}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/10 p-8 rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <h2 className="text-2xl font-light text-white mb-2">Deploy a Task</h2>
            <p className="text-zinc-400 text-sm mb-6">Your task will be routed to the best specialist agent automatically or assigned manually.</p>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wide">Task Description</label>
                <textarea 
                  value={desc} 
                  onChange={e => setDesc(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-zinc-200 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all placeholder:text-zinc-600"
                  rows={4}
                  placeholder="E.g., Research recent advancements in zero-knowledge proofs and write a technical summary."
                />
              </div>
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wide">Bounty In ETH</label>
                  <span className="text-xs text-zinc-500 font-mono transition-colors">{formatUsd(budget)}</span>
                </div>
                <div className="relative">
                  <input 
                    type="number" step="0.01" min="0.001" value={budget} onChange={e => {
                      const val = parseFloat(e.target.value);
                      if (val < 0) setBudget("0");
                      else setBudget(e.target.value);
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 pl-12 text-sm text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-light">Ξ</span>
                </div>
              </div>

              {/* Assignment Method */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wide">Task Assignment</label>
                <div className="flex gap-2 mb-4 bg-white/5 p-1 rounded-xl">
                  <button type="button" onClick={() => setRoutingMode('auto')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${routingMode === 'auto' ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:text-white'}`}>
                    AI Auto-Route
                  </button>
                  <button type="button" onClick={() => setRoutingMode('manual')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${routingMode === 'manual' ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:text-white'}`}>
                    Choose Manual
                  </button>
                </div>
                
                {routingMode === 'manual' && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                    <input 
                      type="text" 
                      placeholder="Search agents by name or capability..." 
                      value={agentSearch}
                      onChange={e => setAgentSearch(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-slate-500"
                    />
                    <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {filteredAgents.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-2">No agents found.</p>
                      ) : (
                        filteredAgents.map(a => (
                          <div 
                            key={a.address}
                            onClick={() => setSelectedAgent(a.address)}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors flex justify-between items-center ${selectedAgent === a.address ? 'bg-indigo-900/30 border-indigo-500' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}
                          >
                            <div className="overflow-hidden">
                              <p className="text-sm font-semibold text-slate-200 truncate">{a.name}</p>
                              <p className="text-[10px] text-slate-500 mt-1 uppercase truncate">{a.capabilities.slice(0, 3).join(', ')}</p>
                            </div>
                            <div className={`w-4 h-4 rounded-full border-2 shrink-0 ml-2 ${selectedAgent === a.address ? 'border-indigo-400 bg-indigo-500' : 'border-slate-600'}`} />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end mt-8 pt-4 border-t border-slate-800 items-center">
                {deployStep !== 0 && (
                  <span className={`text-xs font-medium mr-auto ${deployStep === -1 ? 'text-red-400' : 'text-indigo-400 animate-pulse'}`}>
                    {statusMessages[deployStep]}
                  </span>
                )}
                <button type="button" onClick={() => setModalOpen(false)} disabled={isDeploying} className="px-5 py-2.5 text-sm font-medium text-slate-400 hover:text-white transition-colors disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={isDeploying} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:bg-slate-700">
                  {isDeploying ? 'Processing...' : 'Sign & Deploy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
