import { useApp } from '../context/WebSocketContext';
import { useState } from 'react';
import { LuffaSDK } from '../lib/luffa';
import { Interface } from 'ethers';

// Keep this in sync with the deployed Escrow address from the backend/contracts
const TASK_ESCROW_ADDRESS = '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853';
const TASK_ESCROW_ABI = [
  "function postTask(string description, uint256 deadline) payable"
];

export const Tasks = () => {
  const { tasks, postTask, isLoading } = useApp();
  const [isModalOpen, setModalOpen] = useState(false);
  const [desc, setDesc] = useState('');
  const [budget, setBudget] = useState('0.05');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState(0); 
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!desc || !budget) return;
    setIsDeploying(true);
    setDeployStep(1); // Starting
    setErrorMessage('');
    
    try {
      // Step 1
      await new Promise(r => setTimeout(r, 500));
      setDeployStep(2);
      const posterAddress = await LuffaSDK.getWalletAddress();
      
      // Step 2
      // Using ethers Interface to encode the function call data
      const iface = new Interface(TASK_ESCROW_ABI);
      const data = iface.encodeFunctionData("postTask", [
        desc, 
        Math.floor(Date.now() / 1000) + 86400 // 24-hour deadline
      ]) as string;

      const txHash = await LuffaSDK.signTransaction({
        to: TASK_ESCROW_ADDRESS, // Real Escrow Contract Address
        value: budget,
        data: data 
      });
      
      setDeployStep(3); // "Transaction confirmed. Routing Task to Network..."
      
      // Step 3 (Removed API call)
      // The frontend now fully relies on the Hardhat local node's TaskPosted event
      // passing the notification cleanly back through the websocket to orchestrate!
      
      setDeployStep(4); // Finished
      setTimeout(() => {
        setModalOpen(false);
        setDesc('');
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
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Task Ledger</h1>
          <p className="text-slate-400 text-sm">Escrow-backed agent jobs across the network.</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/20"
        >
          Post Task
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400">
              <th className="p-5 font-semibold">Task</th>
              <th className="p-5 font-semibold">Bounty (ETH)</th>
              <th className="p-5 font-semibold">Status</th>
              <th className="p-5 font-semibold hidden sm:table-cell">Assigned Agent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {isLoading ? (
              [1,2,3].map(i => (
                <tr key={i} className="animate-pulse bg-slate-800/20">
                  <td className="p-5"><div className="h-4 bg-slate-700/50 rounded w-3/4 mb-2"></div><div className="h-3 bg-slate-700/50 rounded w-1/4"></div></td>
                  <td className="p-5"><div className="h-4 bg-slate-700/50 rounded w-16"></div></td>
                  <td className="p-5"><div className="h-6 bg-slate-700/50 rounded w-20"></div></td>
                  <td className="p-5 hidden sm:table-cell"><div className="h-4 bg-slate-700/50 rounded w-24"></div></td>
                </tr>
              ))
            ) : tasks.map((t, i) => (
              <tr key={t.id || i} className="hover:bg-slate-800/40 transition-colors cursor-pointer group">
                <td className="p-5">
                  <p className="text-slate-200 font-medium line-clamp-1 max-w-[300px]">{t.description}</p>
                  <span className="text-[10px] text-slate-500 font-mono mt-1 block">ID: {t.id}</span>
                </td>
                <td className="p-5 text-indigo-300 font-bold">{t.bounty}</td>
                <td className="p-5">
                  <span className={`text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wide font-bold 
                    ${t.status === 'open' ? 'bg-amber-500/20 text-amber-400' : 
                      t.status === 'assigned' ? 'bg-blue-500/20 text-blue-400' : 
                      'bg-emerald-500/20 text-emerald-400'}`}>
                    {t.status}
                  </span>
                </td>
                <td className="p-5 text-slate-400 text-xs hidden sm:table-cell font-mono">
                  {t.assignedAgent ? `${t.assignedAgent.slice(0,6)}...${t.assignedAgent.slice(-4)}` : 'Waiting...'}
                </td>
              </tr>
            ))}
            {!isLoading && tasks.length === 0 && <tr><td colSpan={4} className="p-10 text-center text-slate-500">The escrow ledger is empty.</td></tr>}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl w-full max-w-lg shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-2">Deploy a Task</h2>
            <p className="text-slate-400 text-sm mb-6">Your task will be routed to the best specialist agent automatically.</p>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">Task Description</label>
                <textarea 
                  value={desc} 
                  onChange={e => setDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                  rows={4}
                  placeholder="E.g., Research recent advancements in zero-knowledge proofs and write a technical summary."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">Bounty In ETH</label>
                <div className="relative">
                  <input 
                    type="number" step="0.01" value={budget} onChange={e => setBudget(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 pl-12 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">Ξ</span>
                </div>
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
