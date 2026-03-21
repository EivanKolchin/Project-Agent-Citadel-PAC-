import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AppProvider } from './context/WebSocketContext';
import { Dashboard } from './pages/Dashboard';
import { Agents } from './pages/Agents';
import { Tasks } from './pages/Tasks';
import { NetworkGraph } from './pages/NetworkGraph';
import { Activity, Users, CheckSquare, GitMerge } from 'lucide-react';

const NavLink = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} className={`flex flex-col items-center transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-500 hover:text-indigo-300'}`}>
      <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
      <span className="text-[10px] font-medium mt-1">{label}</span>
    </Link>
  );
};

const Navigation = () => (
  <nav className="fixed bottom-0 w-full bg-slate-900 border-t border-slate-800/80 flex justify-around p-3 z-50 sm:top-0 sm:bottom-auto sm:border-t-0 sm:border-b">
    <NavLink to="/" icon={Activity} label="Status" />
    <NavLink to="/agents" icon={Users} label="Agents" />
    <NavLink to="/tasks" icon={CheckSquare} label="Tasks" />
    <NavLink to="/graph" icon={GitMerge} label="Network" />
  </nav>
);

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="min-h-screen pb-20 sm:pt-20 sm:pb-0 font-sans bg-slate-950">
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
