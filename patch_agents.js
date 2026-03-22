const fs = require('fs');

let code = fs.readFileSync('packages/frontend/src/pages/Agents.tsx', 'utf8');

code = code.replace(
  "const [filter, setFilter] = useState('');\r\n  const [regStatus, setRegStatus] = useState('');",
  `const [filter, setFilter] = useState('');
  const [regStatus, setRegStatus] = useState('');
  const [showCustomReg, setShowCustomReg] = useState(false);
  const [customUid, setCustomUid] = useState('');
  const [customSecret, setCustomSecret] = useState('');
  const [customName, setCustomName] = useState('');
  const [customCaps, setCustomCaps] = useState('general,chat');`
);

// Fallback for LF line endings
code = code.replace(
  "const [filter, setFilter] = useState('');\n  const [regStatus, setRegStatus] = useState('');",
  `const [filter, setFilter] = useState('');
  const [regStatus, setRegStatus] = useState('');
  const [showCustomReg, setShowCustomReg] = useState(false);
  const [customUid, setCustomUid] = useState('');
  const [customSecret, setCustomSecret] = useState('');
  const [customName, setCustomName] = useState('');
  const [customCaps, setCustomCaps] = useState('general,chat');`
);

code = code.replace(
  /const data = iface\.encodeFunctionData\("registerAgent", \[\s*identity\.username,\s*`Frontend-registered agent for \$\{identity\.username\}`,\s*`http:\/\/localhost:3001\/api\/luffa\/\$\{identity\.id\}`,\s*\/\/ mock webhook for demo agent\s*\["general", "chat"\]\s*\]\);/g,
  `const data = iface.encodeFunctionData("registerAgent", [
        showCustomReg ? customName : identity.username,
        \`Frontend-registered agent for \${showCustomReg ? customName : identity.username}\`,
        \`http://localhost:3001/api/luffa/\${showCustomReg ? customUid : identity.id}\`,
        showCustomReg ? customCaps.split(',').map(c => c.trim()) : ["general", "chat"]
      ]);

      if (showCustomReg) {
        await fetch('http://localhost:3001/api/agents/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: customUid,
            secret: customSecret,
            name: customName,
            capabilities: customCaps.split(',').map(c => c.trim())
          })
        });
      }`
);

// Update buttons
code = code.replace(
  `          <button
            onClick={handleRegister}
            className="whitespace-nowrap px-6 py-2.5 bg-white text-black hover:bg-zinc-200 rounded-xl text-sm font-semibold transition-all shadow-lg"
          >
            {regStatus ? 'Wait...' : 'Register Luffa Agent'}
          </button>`,
  `          <button
            onClick={() => setShowCustomReg(!showCustomReg)}
            className="whitespace-nowrap px-6 py-2.5 bg-zinc-800 text-white hover:bg-zinc-700 border border-white/10 rounded-xl text-sm font-semibold transition-all shadow-lg"
          >
            + Add Custom Bot
          </button>
          <button
            onClick={handleRegister}
            className="whitespace-nowrap px-6 py-2.5 bg-white text-black hover:bg-zinc-200 rounded-xl text-sm font-semibold transition-all shadow-lg"
          >
            {regStatus ? 'Wait...' : 'Register Agent'}
          </button>`
);

code = code.replace(
  `      {regStatus && (
        <div className="bg-white/10 border border-white/20 text-white backdrop-blur-md px-5 py-3 rounded-xl text-sm animate-pulse shadow-xl">
          {regStatus}
        </div>
      )}`,
  `      {showCustomReg && (
          <div className="bg-zinc-900/60 p-5 rounded-2xl border border-white/10 flex flex-col gap-3">
            <h3 className="text-white font-medium">Add Manual Agent Setup</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <input type="text" placeholder="Bot Name" value={customName} onChange={e=>setCustomName(e.target.value)} className="px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-sm text-white" />
              <input type="text" placeholder="Luffa UID" value={customUid} onChange={e=>setCustomUid(e.target.value)} className="px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-sm text-white" />
              <input type="password" placeholder="Luffa Secret" value={customSecret} onChange={e=>setCustomSecret(e.target.value)} className="px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-sm text-white" />
              <input type="text" placeholder="Capabilities (comma separated)" value={customCaps} onChange={e=>setCustomCaps(e.target.value)} className="px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-sm text-white" />
            </div>
            <p className="text-xs text-zinc-500 mt-2">Registers an agent seamlessly with on-chain memory + backend API injection.</p>
          </div>
      )}
      {regStatus && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 backdrop-blur-md px-5 py-3 rounded-xl text-sm animate-pulse shadow-xl">
          {regStatus}
        </div>
      )}`
);

fs.writeFileSync('packages/frontend/src/pages/Agents.tsx', code);
console.log('patched');
