const fs = require('fs');
let code = fs.readFileSync('src/pages/Agents.tsx', 'utf-8');

const targetStr = `        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input 
            type="text" 
            placeholder="Filter capability..." 
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-white/30 text-white placeholder-zinc-500 w-full sm:w-56 transition-all"
          />
          <button 
            onClick={handleRegister}
            className="whitespace-nowrap px-6 py-2.5 bg-white text-black hover:bg-zinc-200 rounded-xl text-sm font-semibold transition-all shadow-lg"
          >
            {regStatus ? 'Wait...' : 'Register Luffa Agent'}
          </button>
        </div>
      </div>`;

const replaceStr = `        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input 
            type="text" 
            placeholder="Filter capability..." 
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-white/30 text-white placeholder-zinc-500 w-full sm:w-56 transition-all"
          />
          <button 
            onClick={() => setShowCustomReg(!showCustomReg)}
            className="whitespace-nowrap px-6 py-2.5 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-white/5 rounded-xl text-sm font-semibold transition-all shadow-lg"
          >
            {showCustomReg ? 'Cancel Config' : 'Custom Config'}
          </button>
          <button 
            onClick={handleRegister}
            className="whitespace-nowrap px-6 py-2.5 bg-white text-black hover:bg-zinc-200 rounded-xl text-sm font-semibold transition-all shadow-lg"
          >
            {regStatus ? 'Wait...' : 'Register Agent'}
          </button>
        </div>
      </div>

      {showCustomReg && (
          <div className="bg-zinc-900/60 border border-amber-500/30 backdrop-blur-md p-6 rounded-2xl flex flex-col md:flex-row gap-4 animate-fade-in shadow-2xl items-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/50" />
            <input type="text" placeholder="Luffa Bot UID" value={customUid} onChange={e=>setCustomUid(e.target.value)} className="px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-sm focus:border-amber-400/50 text-white placeholder-zinc-500 w-full outline-none" />
            <input type="password" placeholder="Luffa Secret" value={customSecret} onChange={e=>setCustomSecret(e.target.value)} className="px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-sm focus:border-amber-400/50 text-white placeholder-zinc-500 w-full outline-none" />
            <input type="text" placeholder="Display Name" value={customName} onChange={e=>setCustomName(e.target.value)} className="px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-sm focus:border-amber-400/50 text-white placeholder-zinc-500 w-full outline-none" />
            <input type="text" placeholder="Capabilities (csv)" value={customCaps} onChange={e=>setCustomCaps(e.target.value)} className="px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-sm focus:border-amber-400/50 text-white placeholder-zinc-500 w-full outline-none" />
          </div>
      )}`;

if (code.includes('placeholder="Filter capability..."')) {
  code = code.replace(targetStr, replaceStr);
  fs.writeFileSync('src/pages/Agents.tsx', code);
  console.log("Patched UI for Custom agent registration.");
} else {
  console.log("Could not find UI target.");
}
