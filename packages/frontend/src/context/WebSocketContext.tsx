import { createContext, useContext, useEffect, useState, useRef } from 'react';
import axios from 'axios';

interface AppState {
  stats: any;
  activity: any[];
  agents: any[];
  tasks: any[];
  config: { AGENT_REGISTRY_ADDRESS?: string, TASK_ESCROW_ADDRESS?: string };
  isConnected: boolean;
  isLoading: boolean;
  postTask: (desc: string, budget: string) => Promise<void>;
}

const WSContext = createContext<AppState | null>(null);
const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') || 'http://localhost:3001';
const wsUrl = (import.meta.env.VITE_WS_URL as string | undefined) || apiBase.replace(/^http/i, 'ws');

export const AppProvider = ({ children }: any) => {
  const [stats, setStats] = useState({ totalAgents: 0, activeTasks: 0, completedTasks: 0, totalVolume: '0' });
  const [activity, setActivity] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [config, setConfig] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const fetchInitial = async () => {
      setIsLoading(true);
      try {
        const [statsRes, activityRes, agentsRes, tasksRes, configRes] = await Promise.all([
          axios.get(`${apiBase}/api/stats`).catch(() => ({ data: stats })),
          axios.get(`${apiBase}/api/activity`).catch(() => ({ data: [] })),
          axios.get(`${apiBase}/api/agents`).catch(() => ({ data: [] })),
          axios.get(`${apiBase}/api/tasks`).catch(() => ({ data: [] })),
          axios.get(`${apiBase}/api/config`).catch(() => ({ data: {} }))
        ]);
        setStats(statsRes.data);
        setActivity(activityRes.data);
        setAgents(agentsRes.data);
        setTasks(tasksRes.data);
        setConfig(configRes.data);
      } finally {
        setIsLoading(false);
      }
    };

    const connectWS = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        fetchInitial(); // Fetch latest data on every successful connection
      };

      ws.onmessage = (event) => {
        let data: any;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        
        if (data.type === 'activity') {
          setActivity(prev => [data, ...prev].slice(0, 50));
        } 
        if (data.type === 'history') {
          // Backend sends last 20 events on reconnect
          setActivity(data.events); 
        }
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
        if (data.type === 'agent:registered') {
          axios.get(`${apiBase}/api/agents`).then(r => setAgents(r.data)).catch(() => undefined);
        }
        if (['task:posted', 'task:assigned', 'task:completed', 'task:failed'].includes(data.type)) {
          setTasks(prev => {
            const taskObj = data.task || data;
            const id = taskObj.id ?? taskObj.taskId;
            const existingIndex = prev.findIndex(t => t.id === id);
            const patch: any = { ...taskObj, id };
            if (data.type === 'task:assigned' && data.agentAddress) {
              patch.assignedAgent = data.agentAddress;
            }
            if (data.type === 'task:assigned' && data.agentName) {
              patch.assignedAgentName = data.agentName;
            }
            if (existingIndex >= 0) {
              const next = [...prev];
              next[existingIndex] = { ...next[existingIndex], ...patch };
              return next;
            }
            return [patch, ...prev];
          });
          axios.get(`${apiBase}/api/stats`).then(r => setStats(r.data)).catch(() => undefined);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setTimeout(connectWS, 3000); // Reconnect loop
      };
      
      ws.onerror = () => ws.close(); // Force close to trigger reconnect
    };

    connectWS();
    fetchInitial();
    
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const postTask = async (description: string, budgetEth: string) => {
    await axios.post(`${apiBase}/api/tasks`, { description, budgetEth, posterAddress: '0xClient' });
  };

  return (
    <WSContext.Provider value={{ stats, activity, agents, tasks, config, isConnected, isLoading, postTask }}>
      {children}
    </WSContext.Provider>
  );
};

export const useApp = () => useContext(WSContext)!;
