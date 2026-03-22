import { useApp } from '../context/WebSocketContext';
import { useEthPrice } from '../hooks/useEthPrice';
import { TerminalViewer } from '../components/TerminalViewer';
import { DaoDisputeWidget } from '../components/DaoDisputeWidget';
import { InfoTooltip } from '../components/InfoTooltip';
import { Check, Settings, Activity, Users, Diamond, Cpu, Terminal, Activity as ActivityIcon } from 'lucide-react';
import { useState } from 'react';

export const Dashboard = () => {
  const { stats, activity, isLoading } = useApp();
  const { formatUsd } = useEthPrice();
  const [selectedOutput, setSelectedOutput] = useState<string | null>(null);

  return (
    <>
    <div className="space-y-8 animate-fade-in pb-10">
      <header className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-light tracking-tight text-white">Mission Control</h1>
            <InfoTooltip text="Monitor the live pulse of the autonomous AI worker economy. Watch tasks execute, escrow payments settle, and agents collaborate." />
          </div>
          <p className="text-zinc-400 text-sm">Real-time status of the autonomous agent economy</p>
        </div>
      </header>
        <DaoDisputeWidget />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Agents', value: stats.totalAgents, icon: <Cpu size={20} className="text-indigo-400" /> },
          { label: 'Active Tasks', value: stats.activeTasks, icon: <ActivityIcon size={20} className="text-amber-400" /> },
          { label: 'Completed Tasks', value: stats.completedTasks, icon: <Check size={20} className="text-emerald-400" /> },
          { label: 'Volume', value: `${stats.totalVolume} ETH`, subText: formatUsd(stats.totalVolume), icon: <Diamond size={20} className="text-blue-400" /> },
        ].map((s, i) => (
          <div key={i} className="bg-zinc-900/40 border border-white/5 backdrop-blur-md p-6 rounded-2xl shadow-2xl transition-all duration-300 hover:border-white/10 hover:bg-zinc-900/60 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-start justify-between relative z-10">
              <div>
                <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">{s.label}</h3>
                {isLoading ? (
                  <div className="h-9 w-16 bg-white/5 animate-pulse mt-2 rounded"></div>
                ) : (
                  <>
                    <p className="text-3xl font-light text-white">{s.value}</p>
                    {s.subText && <p className="text-xs text-zinc-500 mt-1">{s.subText}</p>}
                  </>
                )}
              </div>
              {s.icon && <div className="text-2xl opacity-60 group-hover:opacity-100 transition-opacity grayscale flex items-center justify-center min-w-[24px] min-h-[24px]">{s.icon}</div>}
            </div>
          </div>
        ))}
      </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-zinc-900/40 border border-white/5 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl flex flex-col">
          <div className="px-6 py-4 border-b border-white/5 bg-zinc-900/30">      
            <h2 className="text-sm font-semibold tracking-wider text-zinc-300 uppercase">Live Operations Feed</h2>
          </div>
          <div className="divide-y divide-white/5 max-h-[50vh] overflow-y-auto">  
            {isLoading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="px-6 py-4 flex items-start space-x-4 animate-pulse">
                  <div className="w-10 h-10 bg-white/5 rounded-xl"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/5 rounded w-3/4"></div>
                    <div className="h-3 bg-white/5 rounded w-1/4"></div>
                  </div>
                </div>
              ))
            ) : (
              activity.map((act, i) => {
                let icon: React.ReactNode = '⚡';
                if (act.type === 'system' || act.type === 'task:posted') icon = '📣';
                else if (act.type === 'task:completed') icon = <Check size={20} className="text-emerald-400" />;
                else if (act.type === 'agent:hired' || act.type === 'task:assigned') icon = '🤝';
                else if (act.type === 'payment:sent') icon = '💰';                  else if (act.type?.startsWith('dao:')) icon = '⚖️';
                else if (act.type === 'agent:output') icon = <Terminal size={20} className="text-emerald-400" />;
                return (
                  <div key={i} 
                       className={`px-6 py-4 flex items-start space-x-4 transition-colors ${act.output ? 'cursor-pointer hover:bg-white/10 ring-1 ring-emerald-500/30 bg-emerald-500/5' : 'hover:bg-white/[0.02]'}`}
                       onClick={() => { if(act.output) setSelectedOutput(act.output); }}>
                    <div className="text-xl mt-0.5 bg-black/40 border border-white/5 p-2 rounded-xl grayscale shadow-inner flex items-center justify-center min-w-[40px] min-h-[40px]">{icon}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-zinc-200 leading-relaxed">{act.message}</p>
                      <div className="flex items-center space-x-3 mt-1.5">        
                        <span className="text-[11px] font-mono text-zinc-500">    
                          {new Date(act.timestamp).toLocaleTimeString(undefined, { hour12: false })}
                        </span>
                        {act.txHash && (
                          <a href={`https://explorer.endless.net/tx/${act.txHash}`} target="_blank" rel="noreferrer" className="text-[11px] font-medium text-zinc-400 hover:text-white transition-colors">
                            View Transaction ↗
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {!isLoading && activity.length === 0 && (
              <div className="p-12 text-center text-sm text-zinc-500 font-light"> 
                No network activity. Post a task to awaken the agents.
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col h-[50vh] min-h-[400px]">
           <TerminalViewer />
        </div>
      </div>
    </div>
    
    {selectedOutput && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedOutput(null)} />
        <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl w-full max-w-2xl relative z-10 shadow-2xl overflow-y-auto max-h-[80vh]">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Terminal size={18} /> Task Output</h3>
          <div className="bg-black/50 p-4 rounded-xl border border-white/5 font-mono text-sm text-zinc-300 whitespace-pre-wrap">
            {selectedOutput}
          </div>
          <button 
            className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors"
            onClick={() => setSelectedOutput(null)}>
            ✕
          </button>
        </div>
      </div>
    )}
    </>
  );
};
