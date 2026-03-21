import { useApp } from '../context/WebSocketContext';
import { useState } from 'react';

export const Tasks = () => {
  const { tasks, postTask } = useApp();
  const [isModalOpen, setModalOpen] = useState(false);
  const [desc, setDesc] = useState('');
  const [budget, setBudget] = useState('0.05');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!desc || !budget) return;
    await postTask(desc, budget);
    setModalOpen(false);
    setDesc('');
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
            {tasks.map((t, i) => (
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
            {tasks.length === 0 && <tr><td colSpan={4} className="p-10 text-center text-slate-500">The escrow ledger is empty.</td></tr>}
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
              <div className="flex gap-3 justify-end mt-8 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-slate-400 hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/20">Sign & Deploy</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
