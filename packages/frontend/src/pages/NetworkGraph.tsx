import { useApp } from '../context/WebSocketContext';
import { useMemo } from 'react';

/** Simple SVG graph: escrow hub + agents + edges for assigned tasks. */
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
        y: center.y + radius * Math.sin(angle),
      };
    });
  }, [agents]);

  const edges = useMemo(() => {
    const e: any[] = [];
    tasks.forEach((t: any) => {
      const assignee = t.assignedAgent;
      if (assignee) {
        const target = nodes.find((n) => n.address?.toLowerCase() === String(assignee).toLowerCase());
        if (target) {
          e.push({
            id: t.id,
            source: { x: center.x, y: center.y },
            target,
            animated: t.status === 'assigned' || t.status === 'open',
            completed: t.status === 'completed',
          });
        }
      }
    });
    return e;
  }, [tasks, nodes]);

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <header className="border-b border-white/5 pb-6">
        <h1 className="text-3xl font-light tracking-tight text-white mb-1">Network Graph</h1>
        <p className="text-zinc-400 text-sm">Escrow hub, registered agents, and active assignment edges</p>
      </header>

      <div className="w-full aspect-square md:aspect-video max-h-[600px] bg-zinc-900/40 border border-white/5 backdrop-blur-md rounded-3xl overflow-hidden relative flex items-center justify-center shadow-2xl">
        <svg viewBox="0 0 600 600" className="w-full h-full max-w-full max-h-full">
          <defs>
            <radialGradient id="nodeGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#0a0a0a" stopOpacity="0" />
            </radialGradient>
          </defs>

          {edges.map((edge, i) => (
            <line
              key={`edge-${i}`}
              x1={edge.source.x}
              y1={edge.source.y}
              x2={edge.target.x}
              y2={edge.target.y}
              stroke={edge.completed ? '#3f3f46' : '#ffffff'}
              strokeWidth="1.5"
              strokeDasharray={edge.animated ? '4 4' : 'none'}
              className={edge.animated ? 'animate-[dash_1.5s_linear_infinite]' : ''}
              opacity={edge.completed ? '0.3' : '0.4'}
            />
          ))}

          <circle cx={center.x} cy={center.y} r={28} fill="#0a0a0a" stroke="#ffffff" strokeWidth="2" opacity="0.8" />
          <circle cx={center.x} cy={center.y} r={48} fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.1" className="animate-ping" />
          <text x={center.x} y={center.y + 3} textAnchor="middle" fill="#d4d4d8" fontSize="9" fontWeight="600" letterSpacing="0.05em" className="pointer-events-none uppercase">
            ESCROW
          </text>

          {nodes.map((node: any) => (
            <g key={node.address} className="transition-transform duration-500 hover:scale-[1.02] cursor-pointer">
              <circle cx={node.x} cy={node.y} r={32} fill="url(#nodeGrad)" />
              <circle cx={node.x} cy={node.y} r={18} fill="#0a0a0a" stroke="#a1a1aa" strokeWidth="1" />
              <text x={node.x} y={node.y + 36} textAnchor="middle" fill="#a1a1aa" fontSize="11" fontWeight="400">
                {node.name}
              </text>
              {node.currentStatus === 'busy' && (
                <circle cx={node.x + 14} cy={node.y - 14} r={4} fill="#ffffff" className="animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
              )}
            </g>
          ))}
        </svg>
        <style>{`
          @keyframes dash {
            to { stroke-dashoffset: -8; }
          }
        `}</style>
      </div>
    </div>
  );
};
