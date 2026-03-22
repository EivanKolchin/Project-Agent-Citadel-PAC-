import { useApp } from '../context/WebSocketContext';
import { useRef, useEffect, useState } from 'react';
import { Terminal, Cpu, Database, Network } from 'lucide-react';

export const TerminalViewer = () => {
  const { activity } = useApp();
  const endRef = useRef<HTMLDivElement>(null);
  const [selectedOutput, setSelectedOutput] = useState<string | null>(null);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activity]);

  const getLogIcon = (type: string) => {
    if (type.includes('task')) return <Database size={14} className="text-blue-400" />;
    if (type.includes('agent')) return <Cpu size={14} className="text-purple-400" />;
    if (type.includes('payment')) return <Network size={14} className="text-emerald-400" />;
    return <Terminal size={14} className="text-zinc-400" />;
  };

  return (
    <>
    <div className="bg-zinc-900/40 border border-white/5 backdrop-blur-md rounded-[2rem] overflow-hidden shadow-2xl flex flex-col h-full">
      <div className="flex items-center px-6 py-4 border-b border-white/5 bg-zinc-900/30 space-x-3">
        <div className="p-2 bg-indigo-500/20 rounded-full">
          <Terminal size={18} className="text-indigo-400" />
        </div>
        <div className="text-sm font-semibold tracking-wider text-zinc-300 uppercase">
          Agent Protocol Stream
        </div>
      </div>
      <div className="p-4 overflow-y-auto flex-1 h-[400px] space-y-3">
        {activity.slice().reverse().map((a, i) => (
          <div key={i} 
               className={`flex flex-col bg-white/5 border border-white/5 rounded-2xl p-4 transition-colors shadow-sm ${a.type === 'agent:output' && a.output ? 'cursor-pointer hover:bg-white/10 ring-1 ring-emerald-500/30' : 'hover:bg-white/10'}`}
               onClick={() => { if(a.type === 'agent:output' && a.output) setSelectedOutput(a.output); }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-black/30 rounded-full border border-white/5">
                  {getLogIcon(a.type)}
                </div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">
                  {a.type}
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 bg-black/20 px-2 py-1 rounded-full">
                {new Date(a.timestamp).toISOString().split('T')[1].replace('Z', '')}
              </span>
            </div>
            <div className="text-sm text-zinc-300 leading-relaxed font-medium">
              {a.message}
            </div>
          </div>
        ))}
        <div ref={endRef} />
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