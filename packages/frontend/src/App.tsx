import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/WebSocketContext';
import { Dashboard } from './pages/Dashboard';
import { Agents } from './pages/Agents';
import { Tasks } from './pages/Tasks';
import { NetworkGraph } from './pages/NetworkGraph';
import { Activity, Users, CheckSquare, GitMerge } from 'lucide-react';

const NavLink = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${isActive ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-400 hover:text-indigo-500 hover:bg-slate-50'}`}>
      <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
      <span className="text-[10px] font-semibold mt-0.5 tracking-tight">{label}</span>
    </Link>
  );
};

const Navigation = () => (
  // Clean, minimal white/light floating glass style representing Luffa's native shell feel
  <nav className="fixed bottom-0 left-0 w-full sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 sm:w-auto z-50 pointer-events-none">
    <div className="bg-white/95 backdrop-blur-md sm:shadow-2xl sm:shadow-indigo-900/10 sm:border border-slate-200/50 flex justify-around p-2 pointer-events-auto sm:rounded-2xl pb-safe">
      <NavLink to="/" icon={Activity} label="Status" />
      <NavLink to="/agents" icon={Users} label="Agents" />
      <NavLink to="/tasks" icon={CheckSquare} label="Tasks" />
      <NavLink to="/graph" icon={GitMerge} label="Network" />
    </div>
  </nav>
);

const ConnectionBanner = () => {
  const { isConnected } = useApp();
  if (isConnected) return null;
  return (
    <div className="bg-red-500/90 text-white text-xs font-bold text-center py-1.5 w-full absolute top-0 left-0 z-50 animate-pulse">
      Connection to network lost. Reconnecting...
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="min-h-screen pb-20 sm:pt-20 sm:pb-0 font-sans bg-slate-950 relative">
          <ConnectionBanner />
          <Navigation />
          <main className="max-w-7xl mx-auto p-4 md:p-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/agents" element={<Agents />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/graph" element={<NetworkGraph />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}
