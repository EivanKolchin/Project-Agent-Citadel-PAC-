import { createContext, useContext, useEffect, useState, useRef } from 'react';
import axios from 'axios';

interface AppState {
  stats: any;
  activity: any[];
  agents: any[];
  tasks: any[];
  isConnected: boolean;
  isLoading: boolean;
  postTask: (desc: string, budget: string) => Promise<void>;
}

const WSContext = createContext<AppState | null>(null);

export const AppProvider = ({ children }: any) => {
  const [stats, setStats] = useState({ totalAgents: 0, activeTasks: 0, completedTasks: 0, totalVolume: '0' });
  const [activity, setActivity] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const fetchInitial = async () => {
      setIsLoading(true);
      try {
        const [statsRes, activityRes, agentsRes, tasksRes] = await Promise.all([
          axios.get('http://localhost:3001/api/stats').catch(() => ({ data: stats })),
          axios.get('http://localhost:3001/api/activity').catch(() => ({ data: [] })),
          axios.get('http://localhost:3001/api/agents').catch(() => ({ data: [] })),
          axios.get('http://localhost:3001/api/tasks').catch(() => ({ data: [] }))
        ]);
        setStats(statsRes.data);
        setActivity(activityRes.data);
        setAgents(agentsRes.data);
        setTasks(tasksRes.data);
      } finally {
        setIsLoading(false);
      }
    };

    const connectWS = () => {
      const ws = new WebSocket('ws://localhost:3001');
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        fetchInitial(); // Fetch latest data on every successful connection
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
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
        if (['task:posted', 'task:assigned', 'task:completed', 'task:failed'].includes(data.type)) {
          setTasks(prev => {
            const taskObj = data.task || data; 
            const existingIndex = prev.findIndex(t => t.id === taskObj.taskId || t.id === taskObj.id);
            
            if (existingIndex >= 0) {
              const next = [...prev];
              next[existingIndex] = { ...next[existingIndex], ...taskObj };
              return next;
            }
            return [taskObj, ...prev];
          });
          axios.get('http://localhost:3001/api/stats').then(r => setStats(r.data)).catch(console.error);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setTimeout(connectWS, 3000); // Reconnect loop
      };
      
      ws.onerror = () => ws.close(); // Force close to trigger reconnect
    };

    connectWS();
    
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const postTask = async (description: string, budgetEth: string) => {
    await axios.post('http://localhost:3001/api/tasks', { description, budgetEth, posterAddress: '0xClient' });
  };

  return (
    <WSContext.Provider value={{ stats, activity, agents, tasks, isConnected, isLoading, postTask }}>
      {children}
    </WSContext.Provider>
  );
};

export const useApp = () => useContext(WSContext)!;
