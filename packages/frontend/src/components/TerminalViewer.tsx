import { useApp } from '../context/WebSocketContext';
import { useRef, useEffect } from 'react';

export const TerminalViewer = () => {
  const { activity } = useApp();
  const endRef = useRef<HTMLDivElement>(null);

  // We filter activities to find 'agent-thought' or just print everything raw
  const terminalLines = activity
    .slice()
    .reverse()
    .map(a => `[${new Date(a.timestamp).toISOString().split('T')[1].replace('Z', '')}] [${a.type.toUpperCase()}] ${a.message}`)
    .join('\n');

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activity]);

  return (
    <div className="bg-black/90 border border-[#333] rounded-xl overflow-hidden shadow-2xl flex flex-col h-full font-mono text-xs">
      <div className="flex items-center px-4 py-2 border-b border-[#333] bg-[#1a1a1a]">
        <div className="flex space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
        </div>
        <div className="ml-4 text-[#888] font-semibold text-[10px] uppercase tracking-widest">
          Node Output Stream
        </div>
      </div>
      <div className="p-4 overflow-y-auto whitespace-pre-wrap text-emerald-400 bg-transparent flex-1 h-[400px]">
        {terminalLines}
        <div ref={endRef} />
      </div>
    </div>
  );
};