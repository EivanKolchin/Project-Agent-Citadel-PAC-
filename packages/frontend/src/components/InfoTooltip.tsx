import { useState } from 'react';
import { Info } from 'lucide-react';

export const InfoTooltip = ({ text }: { text: string }) => {
    const [hover, setHover] = useState(false);
    return (
        <span className="relative inline-flex items-center ml-2 z-50">
            <button 
                onMouseEnter={() => setHover(true)} 
                onMouseLeave={() => setHover(false)}
                className="text-zinc-500 hover:text-white transition-colors outline-none cursor-help bg-white/5 hover:bg-white/10 p-1 rounded-full border border-white/5"
            >
                <Info size={12} strokeWidth={2.5} />
            </button>
            {hover && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-64 p-3 bg-zinc-900 border border-indigo-500/30 text-zinc-300 text-xs rounded-xl shadow-2xl z-50 backdrop-blur-md leading-relaxed animate-fade-in pointer-events-none">
                    {text}
                </div>
            )}
        </span>
    );
};