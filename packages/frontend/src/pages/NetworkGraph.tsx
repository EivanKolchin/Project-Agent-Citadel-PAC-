import { useApp } from '../context/WebSocketContext';
import { useMemo, useEffect, useState, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

/** Real-time physics-based constellation graph representing the agent network. */
export const NetworkGraph = () => {
  const { agents, tasks } = useApp();
  const graphRef = useRef<any>();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateDims = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };
    window.addEventListener('resize', updateDims);
    updateDims();
    return () => window.removeEventListener('resize', updateDims);
  }, []);

  const graphData = useMemo(() => {
    const minRep = Math.min(...agents.map(a => a.reputationScore || 0), 0);
    const maxRep = Math.max(...agents.map(a => a.reputationScore || 0), 10);
    
    const nodes = [
      { id: 'ESCROW', name: 'NETWORK ESCROW', type: 'hub', val: 15 },
      ...agents.map((agent: any) => ({
        id: String(agent.address).toLowerCase(),
        name: agent.name,
        type: 'agent',
        status: agent.currentStatus,
        val: 5 + ((agent.reputationScore || 0) / (maxRep || 1)) * 10
      }))
    ];

    const links = tasks
      .filter((t: any) => t.assignedAgent && ['assigned', 'open'].includes(t.status))
      .map((t: any) => ({
        source: 'ESCROW',
        target: String(t.assignedAgent).toLowerCase(),
        name: taskIdToName(t),
        status: t.status
      }));

    return { nodes, links };
  }, [agents, tasks]);
  
  function taskIdToName(t: any) {
     return t.description ? t.description.slice(0,15) + "..." : `Task ${t.id}`;
  }

  return (
    <div className="space-y-4 animate-fade-in pb-10 flex flex-col h-[calc(100vh-140px)]">
      <header className="border-b border-white/5 pb-4 shrink-0">
        <h1 className="text-3xl font-light tracking-tight text-white mb-1">Network Constellation</h1>
        <p className="text-zinc-400 text-sm">Real-time physics graph of network topology and escrow edge distribution</p>
      </header>

      <div 
        ref={containerRef}
        className="w-full flex-1 bg-zinc-950/80 border border-white/5 backdrop-blur-md rounded-3xl overflow-hidden relative shadow-2xl"
      >
        <ForceGraph2D
          ref={graphRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeLabel="name"
          nodeColor={node => node.type === 'hub' ? '#ffffff' : (node.status === 'busy' ? '#4ade80' : '#4f46e5')}
          nodeRelSize={1}
          linkColor={() => '#ffffff40'}
          linkWidth={1.5}
          linkDirectionalParticles={2}
          linkDirectionalParticleSpeed={0.005}
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            const label = node.name;
            const fontSize = node.type === 'hub' ? 14/globalScale : 12/globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); 
            
            ctx.fillStyle = node.type === 'hub' ? 'rgba(255, 255, 255, 0.9)' : (node.status === 'busy' ? 'rgba(74, 222, 128, 0.9)' : 'rgba(79, 70, 229, 0.9)');
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
            ctx.fill();
            
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(label, node.x, node.y + node.val + fontSize);
          }}
          cooldownTicks={100}
          onEngineStop={() => {
            if (graphRef.current) {
                graphRef.current.zoomToFit(400, 50);
            }
          }}
        />
        
        <div className="absolute bottom-4 left-4 flex gap-4 pointer-events-none">
           <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#4f46e5]"></div><span className="text-xs text-zinc-400">Idle Agent</span></div>
           <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#4ade80]"></div><span className="text-xs text-zinc-400">Active Task</span></div>
           <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-white"></div><span className="text-xs text-zinc-400">Escrow Hub</span></div>
        </div>
      </div>
    </div>
  );
};
