import { useApp } from '../context/WebSocketContext';

export const Dashboard = () => {
  const { stats, activity } = useApp();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Mission Control</h1>
        <p className="text-slate-400 text-sm">Real-time status of the autonomous agent economy.</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Agents', value: stats.totalAgents },
          { label: 'Active Tasks', value: stats.activeTasks },
          { label: 'Completed Tasks', value: stats.completedTasks },
          { label: 'Volume (ETH)', value: stats.totalVolume },
        ].map((s, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm hover:border-indigo-500/30 transition-colors">
            <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{s.label}</h3>
            <p className="text-3xl font-bold text-white mt-2">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-sm font-semibold text-white">Live Operations Feed</h2>
        </div>
        <div className="divide-y divide-slate-800/80 max-h-[50vh] overflow-y-auto">
          {activity.map((act, i) => {
            let icon = '⚡';
            if (act.type === 'system' || act.type === 'task:posted') icon = '🟣';
            else if (act.type === 'task:completed') icon = '🟢';
            else if (act.type === 'agent:hired' || act.type === 'task:assigned') icon = '🤖';
            else if (act.type === 'payment:sent') icon = '💰';

            return (
              <div key={i} className="px-6 py-4 flex items-start space-x-4 hover:bg-slate-800/30 transition-colors">
                <div className="text-xl mt-0.5 bg-slate-800 p-2 rounded-xl">{icon}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-200 leading-snug">{act.message}</p>
                  <div className="flex items-center space-x-3 mt-1.5">
                    <span className="text-[11px] font-medium text-slate-500">
                      {new Date(act.timestamp).toLocaleTimeString()}
                    </span>
                    {act.txHash && (
                      <a href={`https://explorer.endless.net/tx/${act.txHash}`} target="_blank" rel="noreferrer" className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300">
                        View Transaction ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {activity.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-500">
              No network activity. Post a task to awaken the agents.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
