import { useApp } from '../context/WebSocketContext';
import { useEthPrice } from '../hooks/useEthPrice';

export const AgentLeaderboard = () => {
    const { agents, isLoading } = useApp();
    const { formatUsd } = useEthPrice();

    if (isLoading) return null;

    const sortedByTasks = [...agents].sort((a,b) => b.tasksCompleted - a.tasksCompleted);
    const sortedByRep = [...agents].sort((a,b) => b.reputationScore - a.reputationScore);
    const sortedByETH = [...agents].sort((a,b) => parseFloat(a.stakedAmount) - parseFloat(b.stakedAmount)); // Using stake as pseudo-earnings

    const topTask = sortedByTasks[0];
    const topRep = sortedByRep[0];
    const topETH = sortedByETH[0];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 p-4 rounded-xl backdrop-blur-md">
                <h4 className="text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">🏅 Highest Reputation</h4>
                <div className="text-white text-lg">{topRep ? topRep.name : 'N/A'}</div>
                <div className="text-indigo-500/60 text-xs mt-1">{topRep ? `Score: ${topRep.reputationScore}` : ''}</div>
            </div>
            <div className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 p-4 rounded-xl backdrop-blur-md">
                <h4 className="text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">⚡ Most Tasks</h4>
                <div className="text-white text-lg">{topTask ? topTask.name : 'N/A'}</div>
                <div className="text-emerald-500/60 text-xs mt-1">{topTask ? `${topTask.tasksCompleted} Completed` : ''}</div>
            </div>
            <div className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 p-4 rounded-xl backdrop-blur-md">
                <h4 className="text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">💰 Largest Stake</h4>
                <div className="text-white text-lg">{topETH ? topETH.name : 'N/A'}</div>
                <div className="text-amber-500/60 text-xs mt-1">{topETH ? `${topETH.stakedAmount} ETH` : ''}</div>
            </div>
        </div>
    );
};