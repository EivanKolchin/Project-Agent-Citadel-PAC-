import { useApp } from '../context/WebSocketContext';
import { useEthPrice } from '../hooks/useEthPrice';

export const Dashboard = () => {
  const { stats, activity, isLoading } = useApp();
  const { formatUsd } = useEthPrice();

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-white mb-1">Mission Control</h1>
          <p className="text-zinc-400 text-sm">Real-time status of the autonomous agent economy</p>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Agents', value: stats.totalAgents, icon: '⚡' },
          { label: 'Active Tasks', value: stats.activeTasks, icon: '⚙️' },
          { label: 'Completed Tasks', value: stats.completedTasks, icon: '✅' },
          { label: 'Volume', value: `${stats.totalVolume} ETH`, subText: formatUsd(stats.totalVolume), icon: '💎' },
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
              {s.icon && <div className="text-2xl opacity-60 group-hover:opacity-100 transition-opacity grayscale">{s.icon}</div>}
            </div>
          </div>
        ))}
      </div>

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
              let icon = '⚡';
              if (act.type === 'system' || act.type === 'task:posted') icon = '🟣';
              else if (act.type === 'task:completed') icon = '🟢';
              else if (act.type === 'agent:hired' || act.type === 'task:assigned') icon = '🤖';
              else if (act.type === 'payment:sent') icon = '💰';

              return (
                <div key={i} className="px-6 py-4 flex items-start space-x-4 hover:bg-white/[0.02] transition-colors">
                  <div className="text-xl mt-0.5 bg-black/40 border border-white/5 p-2 rounded-xl grayscale shadow-inner">{icon}</div>
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
    </div>
  );
};
