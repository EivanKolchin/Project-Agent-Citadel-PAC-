import { useApp } from '../context/WebSocketContext';
import { useMemo } from 'react';

export const NetworkGraph = () => {
  const { agents, tasks } = useApp();

  const radius = 160;
  const center = { x: 300, y: 300 };

  const nodes = useMemo(() => {
    return agents.map((agent: any, i: number) => {
      const angle = (i / Math.max(1, agents.length)) * 2 * Math.PI;
      return {
        ...agent,
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle)
      };
    });
  }, [agents]);

  const edges = useMemo(() => {
    const e: any[] = [];
    tasks.forEach(t => {
      if (t.assignedAgent) {
        const target = nodes.find(n => n.address === t.assignedAgent);
        if (target) {
          e.push({
            id: t.id,
            source: { x: center.x, y: center.y },
            target,
            animated: t.status === 'assigned' || t.status === 'open',
            completed: t.status === 'completed'
          });
        }
      }
    });
    return e;
  }, [tasks, nodes]);

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Network Graph</h1>
        <p className="text-slate-400 text-sm">Visualizing live task routing, delegation, and payment flows.</p>
      </header>
      
      <div className="w-full aspect-square md:aspect-video max-h-[600px] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden relative flex items-center justify-center shadow-inner">
        <svg viewBox="0 0 600 600" className="w-full h-full max-w-full max-h-full">
          <defs>
            <radialGradient id="nodeGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4"/>
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0"/>
            </radialGradient>
          </defs>

          {/* Draw Sub-Task Connections (Edges) */}
          {edges.map((edge, i) => (
            <line 
              key={`edge-${i}`}
              x1={edge.source.x} y1={edge.source.y}
              x2={edge.target.x} y2={edge.target.y}
              stroke={edge.completed ? "#10b981" : "#818cf8"}
              strokeWidth="2"
              strokeDasharray={edge.animated ? "6 6" : "none"}
              className={edge.animated ? "animate-[dash_1s_linear_infinite]" : ""}
              opacity={edge.completed ? "0.3" : "0.7"}
            />
          ))}

          {/* Central Escrow / User Router Node */}
          <circle cx={center.x} cy={center.y} r={28} fill="#0f172a" stroke="#6366f1" strokeWidth="3" />
          <circle cx={center.x} cy={center.y} r={48} fill="none" stroke="#6366f1" strokeWidth="1" opacity="0.2" className="animate-ping" />
          <text x={center.x} y={center.y + 4} textAnchor="middle" fill="#c7d2fe" fontSize="10" fontWeight="bold" className="pointer-events-none">ESCROW</text>

          {/* Connected Agent Nodes */}
          {nodes.map(node => (
            <g key={node.address} className="transition-transform duration-500 hover:scale-110 cursor-pointer">
              <circle cx={node.x} cy={node.y} r={40} fill="url(#nodeGrad)" />
              <circle cx={node.x} cy={node.y} r={20} fill="#1e293b" stroke="#818cf8" strokeWidth="2" />
              <text x={node.x} y={node.y + 35} textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="500">{node.name}</text>
              {node.currentStatus === 'busy' && (
                <circle cx={node.x + 14} cy={node.y - 14} r={5} fill="#10b981" className="animate-pulse" />
              )}
            </g>
          ))}
        </svg>
        <style>{`
          @keyframes dash {
            to { stroke-dashoffset: -12; }
          }
        `}</style>
      </div>
    </div>
  );
};
