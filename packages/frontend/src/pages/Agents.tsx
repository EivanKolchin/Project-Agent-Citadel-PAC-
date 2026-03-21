import { useApp } from '../context/WebSocketContext';
import { useState } from 'react';
import { LuffaSDK } from '../lib/luffa';

export const Agents = () => {
  const { agents, isLoading } = useApp();
  const [filter, setFilter] = useState('');
  const [regStatus, setRegStatus] = useState('');

  const filtered = agents.filter(a => !filter || a.capabilities.some((c: string) => c.toLowerCase().includes(filter.toLowerCase())));

  const handleRegister = async () => {
    try {
      setRegStatus('Authenticating Luffa Identity...');
      const identity = await LuffaSDK.getUserIdentity();
      
      setRegStatus(`Getting Wallet for ${identity.username}...`);
      const address = await LuffaSDK.getWalletAddress();
      
      setRegStatus('Please sign 0.01 ETH staking provision.');
      await LuffaSDK.signTransaction({ to: 'AgentRegistryContract', value: '0.01' });

      setRegStatus('Agent Registration Complete!');
      setTimeout(() => setRegStatus(''), 3000);
    } catch (e: any) {
      setRegStatus(`Binding Error: ${e.message}`);
      setTimeout(() => setRegStatus(''), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Agent Roster</h1>
          <p className="text-slate-400 text-sm">Specialists currently online and accepting tasks.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input 
            type="text" 
            placeholder="Filter capability..." 
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-slate-500 w-full sm:w-48 transition-all"
          />
          <button 
            onClick={handleRegister}
            className="whitespace-nowrap px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm font-semibold text-white transition-all shadow-sm"
          >
            {regStatus ? 'Wait...' : 'Register Luffa Agent'}
          </button>
        </div>
      </div>
      {regStatus && (
        <div className="bg-indigo-900/30 border border-indigo-500/50 text-indigo-300 px-4 py-3 rounded-xl text-sm animate-pulse">
          {regStatus}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          [1,2,3].map(i => (
            <div key={i} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col animate-pulse">
              <div className="flex justify-between items-start mb-3">
                <div className="w-1/2">
                  <div className="h-5 bg-slate-800 rounded w-full mb-2"></div>
                  <div className="h-3 bg-slate-800 rounded w-2/3"></div>
                </div>
                <div className="h-4 w-12 bg-slate-800 rounded-md"></div>
              </div>
              <div className="h-10 bg-slate-800 rounded w-full mt-2"></div>
              <div className="mt-5 flex gap-2">
                <div className="h-5 w-16 bg-slate-800 rounded-md"></div>
                <div className="h-5 w-20 bg-slate-800 rounded-md"></div>
              </div>
              <div className="mt-auto pt-6">
                <div className="h-2 bg-slate-800 rounded-full w-full"></div>
              </div>
            </div>
          ))
        ) : filtered.map(agent => (
          <div key={agent.address} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col hover:border-indigo-500/50 hover:bg-slate-800/20 transition-all cursor-crosshair">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-lg text-slate-100">{agent.name}</h3>
                <p className="text-xs font-mono text-slate-500 mt-1">{agent.address.slice(0, 6)}...{agent.address.slice(-4)}</p>
              </div>
              <span className={`text-[10px] px-2.5 py-1 rounded-md uppercase font-bold tracking-wider ${agent.currentStatus === 'offline' ? 'bg-red-500/20 text-red-400' : agent.currentStatus === 'idle' ? 'bg-slate-800 text-slate-400' : 'bg-green-500/20 text-green-400'}`}>
                {agent.currentStatus || 'idle'}
              </span>
            </div>
            
            <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">{agent.description}</p>
            
            <div className="mt-5 flex flex-wrap gap-2">
              {agent.capabilities.map((c: string) => (
                <span key={c} className="text-[10px] bg-slate-950 font-medium text-indigo-300 border border-indigo-500/20 px-2 py-1 rounded-md">{c}</span>
              ))}
            </div>
            
            <div className="mt-auto pt-6">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-slate-400 font-medium">Reputation Score</span>
                <span className="text-indigo-400 font-bold">{agent.reputationScore}</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800/50">
                <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.min(100, agent.reputationScore)}%` }} />
              </div>
              <p className="text-right text-[10px] text-slate-500 mt-2">{agent.tasksCompleted} Tasks Completed</p>
            </div>
          </div>
        ))}
        {!isLoading && filtered.length === 0 && <p className="text-slate-500 col-span-full">No agents found matching capabilities.</p>}
      </div>
    </div>
  );
};
