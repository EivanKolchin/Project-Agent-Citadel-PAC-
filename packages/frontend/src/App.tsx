import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/WebSocketContext';
import { Dashboard } from './pages/Dashboard';
import { Agents } from './pages/Agents';
import { Tasks } from './pages/Tasks';
import { Settings } from './pages/Settings';
import { Activity, Users, CheckSquare, Settings as SettingsIcon, GitMerge } from 'lucide-react';
import { NetworkGraph } from './pages/NetworkGraph';
import { useState, useEffect } from 'react';
import { WalletProvider, useWallet } from './context/WalletContext';
import { Wallet } from 'lucide-react';

const NavLink = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all duration-300 ${isActive ? 'text-white bg-white/10 shadow-inner' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}>
      <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
      <span className="text-[10px] font-medium mt-1 tracking-wider uppercase opacity-80">{label}</span>
    </Link>
  );
};

const Navigation = () => (
  // Sleek, minimal dark floating glass style
  <nav className="fixed bottom-0 left-0 w-full sm:bottom-8 sm:left-1/2 sm:-translate-x-1/2 sm:w-auto z-50 pointer-events-none">
    <div className="bg-zinc-950/80 backdrop-blur-xl sm:shadow-2xl sm:shadow-black/50 border-t border-white/5 sm:border sm:rounded-2xl flex justify-around p-2 pointer-events-auto pb-safe">
      <NavLink to="/" icon={Activity} label="Status" />
      <NavLink to="/agents" icon={Users} label="Agents" />
      <NavLink to="/tasks" icon={CheckSquare} label="Tasks" />
      <NavLink to="/graph" icon={GitMerge} label="Network" />
      <NavLink to="/settings" icon={SettingsIcon} label="Settings" />
    </div>
  </nav>
);

const ConnectionBanner = () => {
  const { isConnected } = useApp();
  if (isConnected) return null;
  return (
    <div className="bg-red-500/10 backdrop-blur-md border-b border-red-500/20 text-red-400 text-xs font-medium tracking-widest uppercase text-center py-2 w-full absolute top-0 left-0 z-50">
      Network Connection Lost &mdash; Reconnecting...
    </div>
  );
};

const DummyModeBanner = () => {
  const { provider } = useWallet();
  const { config } = useApp();
  const [isDummy, setIsDummy] = useState(() => {
    if (provider) return false;
    return localStorage.getItem('dummy_mode') === 'true';
  });

  useEffect(() => {
    if (provider || config?.rpcConnected) {
       localStorage.removeItem('dummy_mode');
       setIsDummy(false);
       window.dispatchEvent(new Event('storage'));
    }
  }, [provider, config]);

  useEffect(() => {
    const handleStorage = () => setIsDummy(localStorage.getItem('dummy_mode') === 'true');
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(() => {
      const mode = localStorage.getItem('dummy_mode') === 'true';
      if ((provider || config?.rpcConnected) && mode) {
        localStorage.removeItem('dummy_mode');
        setIsDummy(false);
        window.dispatchEvent(new Event('storage'));
      } else {
        setIsDummy(mode);
      }
    }, 2000);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [provider, config]);

  if (!isDummy) return null;

  return (
    <div className="bg-amber-500/10 backdrop-blur-md text-amber-400 text-[10px] font-medium tracking-widest uppercase text-center py-2 w-full flex items-center justify-center space-x-3 z-40 border-b border-amber-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
      <span>Testnet Simulated Environment Active</span>
    </div>
  );
};

const WalletWidget = () => {
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
  
export default function App() {
  const [isDummy, setIsDummy] = useState(localStorage.getItem('dummy_mode') === 'true');

  useEffect(() => {
    const handleStorage = () => setIsDummy(localStorage.getItem('dummy_mode') === 'true');
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(handleStorage, 2000);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  return (
    <AppProvider>
      <WalletProvider>
      <BrowserRouter>
        <div className={`min-h-screen pb-24 sm:pt-16 sm:pb-0 font-sans relative transition-colors duration-700 bg-[#0a0a0a] text-zinc-300 ${isDummy ? 'bg-gradient-to-b from-[#14120f] to-[#0a0a0a]' : ''}`}>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>
          <div className="absolute top-0 left-0 w-full z-50 flex flex-col pointer-events-auto">
            <ConnectionBanner />
            <DummyModeBanner />
          </div>
          <WalletWidget />
          <Navigation />
          <main className={`max-w-7xl mx-auto p-4 md:p-8 transition-transform duration-500 relative z-10 ${isDummy ? 'translate-y-6 sm:translate-y-2' : ''}`}>  
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
    </AppProvider>
  );
}
