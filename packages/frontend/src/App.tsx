import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/WebSocketContext';
import { Dashboard } from './pages/Dashboard';
import { Agents } from './pages/Agents';
import { Tasks } from './pages/Tasks';
import { Settings } from './pages/Settings';
import { Activity, Users, CheckSquare, Settings as SettingsIcon, User, LogOut } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
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

const WalletWidget = () => {
  const { address, connect, disconnect } = useWallet();

  return (
    <div className="z-50 pointer-events-auto flex items-center gap-2">
      {address ? (
        <>
          <button onClick={disconnect} className="flex items-center space-x-2 bg-zinc-900/80 border border-white/10 px-4 py-2 rounded-xl text-xs font-mono text-zinc-300 hover:bg-zinc-800 transition-colors backdrop-blur-md">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{address.slice(0,6)}...{address.slice(-4)}</span>
          </button>
        </>
      ) : (
        <button onClick={connect} className="flex items-center space-x-2 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-xl text-xs font-mono text-blue-400 hover:bg-blue-500/20 transition-colors backdrop-blur-md">
          <Wallet size={14} />
          <span>Connect Web3</span>
        </button>
      )}
    </div>
  );
};

const ProfileWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [userName, setUserName] = useState(localStorage.getItem('pac_profile_name') || 'Operator');
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('pac_logged_in') === 'true');

  useEffect(() => {
    const handleStorage = () => {
      setUserName(localStorage.getItem('pac_profile_name') || 'Operator');
      setIsLoggedIn(localStorage.getItem('pac_logged_in') === 'true');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative z-50 pointer-events-auto" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 bg-zinc-900/80 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors backdrop-blur-md"
      >
        <User size={18} />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden py-1 animate-in fade-in slide-in-from-top-2">
          {isLoggedIn ? (
            <>
              <div className="px-4 py-3 border-b border-white/5">
                <p className="text-xs text-zinc-400 font-medium">Signed in as</p>
                <p className="text-sm text-white font-semibold truncate">{userName}</p>
              </div>
              <div className="py-1">
                <Link to="/settings" onClick={() => setIsOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-colors">
                  <SettingsIcon size={14} className="mr-3 text-zinc-500" />
                  Account Settings
                </Link>
                <button 
                  onClick={() => {
                    localStorage.setItem('pac_logged_in', 'false');
                    window.dispatchEvent(new Event('storage'));
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut size={14} className="mr-3" />
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <div className="py-2 px-4 space-y-3">
              <p className="text-xs text-zinc-400">Sign in to manage your profile.</p>
              <Link 
                to="/settings" 
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center justify-center bg-white text-black hover:bg-zinc-200 text-sm font-semibold py-2 px-4 rounded-xl transition-all"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
  
export default function App() {

  return (
    <AppProvider>
      <WalletProvider>
      <BrowserRouter>
        <div className={`min-h-screen pb-24 sm:pt-16 sm:pb-0 font-sans relative transition-colors duration-700 bg-[#0a0a0a] text-zinc-300`}>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>
          <div className="absolute top-0 left-0 w-full z-50 flex flex-col pointer-events-auto">
            <ConnectionBanner />
          </div>
          <div className="absolute top-4 right-4 z-50 flex items-center space-x-3 pointer-events-none">
            <WalletWidget />
            <ProfileWidget />
          </div>
          <Navigation />
          <main className={`max-w-7xl mx-auto p-4 md:p-8 transition-transform duration-500 relative z-10`}>  
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/agents" element={<Agents />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
      </WalletProvider>
    </AppProvider>
  );
}
