const fs = require('fs');
const path = 'packages/frontend/src/App.tsx';
let code = fs.readFileSync(path, 'utf8');

const importReplacement = `import { useState, useEffect } from 'react';\nimport { WalletProvider, useWallet } from './context/WalletContext';\nimport { Wallet } from 'lucide-react';`;

code = code.replace(/import \{ useState, useEffect \} from 'react';/, importReplacement);

const walletWidget = `const WalletWidget = () => {
  const { address, connect, disconnect } = useWallet();
  return (
    <div className="absolute top-4 right-4 z-50 pointer-events-auto">
      {address ? (
        <button onClick={disconnect} className="flex items-center space-x-2 bg-zinc-900/80 border border-white/10 px-4 py-2 rounded-xl text-xs font-mono text-zinc-300 hover:bg-zinc-800 transition-colors backdrop-blur-md">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{address.slice(0,6)}...{address.slice(-4)}</span>
        </button>
      ) : (
        <button onClick={connect} className="flex items-center space-x-2 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-xl text-xs font-mono text-blue-400 hover:bg-blue-500/20 transition-colors backdrop-blur-md">
          <Wallet size={14} />
          <span>Connect Web3</span>
        </button>
      )}
    </div>
  );
};
  
export default function App() {`;

code = code.replace(/export default function App\(\) \{/, walletWidget);

const appReplacement = `<AppProvider>
      <WalletProvider>
      <BrowserRouter>
        <div className={\`min-h-screen pb-24 sm:pt-16 sm:pb-0 font-sans relative transition-colors duration-700 bg-[#0a0a0a] text-zinc-300 \${isDummy ? 'bg-gradient-to-b from-[#14120f] to-[#0a0a0a]' : ''}\`}>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>
          <div className="absolute top-0 left-0 w-full z-50 flex flex-col pointer-events-auto">
            <ConnectionBanner />
            <DummyModeBanner />
          </div>
          <WalletWidget />
          <Navigation />
          <main className={\`max-w-7xl mx-auto p-4 md:p-8 transition-transform duration-500 relative z-10 \${isDummy ? 'translate-y-6 sm:translate-y-2' : ''}\`}>  
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/agents" element={<Agents />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/graph" element={<NetworkGraph />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
      </WalletProvider>
    </AppProvider>`;

code = code.replace(/<AppProvider>[\s\S]*<\/AppProvider>/, appReplacement);

fs.writeFileSync(path, code);
console.log("App.tsx updated to include Web3 provider");