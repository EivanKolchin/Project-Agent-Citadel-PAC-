const fs = require('fs');
const path = 'packages/frontend/src/pages/Dashboard.tsx';
let code = fs.readFileSync(path, 'utf8');

const importReplacement = `import { useApp } from '../context/WebSocketContext';
import { useEthPrice } from '../hooks/useEthPrice';
import { TerminalViewer } from '../components/TerminalViewer';`;

code = code.replace(/import \{ useApp \} from '\.\.\/context\/WebSocketContext';\r?\nimport \{ useEthPrice \} from '\.\.\/hooks\/useEthPrice';/, importReplacement);

const structureReplacement = `      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                if (act.type === 'system' || act.type === 'task:posted') icon = '📣';
                else if (act.type === 'task:completed') icon = '✅';
                else if (act.type === 'agent:hired' || act.type === 'task:assigned') icon = '🤝';
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
                          <a href={\`https://explorer.endless.net/tx/\${act.txHash}\`} target="_blank" rel="noreferrer" className="text-[11px] font-medium text-zinc-400 hover:text-white transition-colors">
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
  );
};`;

code = code.replace(/<div className="bg-zinc-900\/40 border border-white\/5 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl flex flex-col">[\s\S]*<\/div>\s*<\/div>\s*\);\s*\};/m, structureReplacement);

fs.writeFileSync(path, code);
console.log("Dashboard updated with Terminal");