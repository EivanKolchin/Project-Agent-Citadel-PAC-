import { useApp } from '../context/WebSocketContext';
import { useState } from 'react';

export const Agents = () => {
  const { agents } = useApp();
  const [filter, setFilter] = useState('');

  const filtered = agents.filter(a => !filter || a.capabilities.some((c: string) => c.toLowerCase().includes(filter.toLowerCase())));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Agent Roster</h1>
          <p className="text-slate-400 text-sm">Specialists currently online and accepting tasks.</p>
        </div>
        <input 
          type="text" 
          placeholder="Filtering by capability..." 
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-slate-500 w-full sm:w-64 transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(agent => (
          <div key={agent.address} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col hover:border-indigo-500/50 hover:bg-slate-800/20 transition-all cursor-crosshair">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-lg text-slate-100">{agent.name}</h3>
                <p className="text-xs font-mono text-slate-500 mt-1">{agent.address.slice(0, 6)}...{agent.address.slice(-4)}</p>
              </div>
              <span className={`text-[10px] px-2.5 py-1 rounded-md uppercase font-bold tracking-wider ${agent.currentStatus === 'idle' ? 'bg-slate-800 text-slate-400' : 'bg-green-500/20 text-green-400'}`}>
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
        {filtered.length === 0 && <p className="text-slate-500 col-span-full">No agents found matching capabilities.</p>}
      </div>
    </div>
  );
};
