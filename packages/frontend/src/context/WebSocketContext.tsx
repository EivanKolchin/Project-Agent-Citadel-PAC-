import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

interface AppState {
  stats: any;
  activity: any[];
  agents: any[];
  tasks: any[];
  postTask: (desc: string, budget: string) => Promise<void>;
}

const WSContext = createContext<AppState | null>(null);

export const AppProvider = ({ children }: any) => {
  const [stats, setStats] = useState({ totalAgents: 0, activeTasks: 0, completedTasks: 0, totalVolume: '0' });
  const [activity, setActivity] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    // Initial fetch
    axios.get('http://localhost:3001/api/stats').then(r => setStats(r.data)).catch(console.error);
    axios.get('http://localhost:3001/api/activity').then(r => setActivity(r.data)).catch(console.error);
    axios.get('http://localhost:3001/api/agents').then(r => setAgents(r.data)).catch(console.error);
    axios.get('http://localhost:3001/api/tasks').then(r => setTasks(r.data)).catch(console.error);

    const ws = new WebSocket('ws://localhost:3001');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'activity') {
        setActivity(prev => [data, ...prev].slice(0, 50));
      } 
      if (['task:posted', 'task:assigned', 'task:completed'].includes(data.type)) {
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
    
    return () => ws.close();
  }, []);

  const postTask = async (description: string, budgetEth: string) => {
    await axios.post('http://localhost:3001/api/tasks', { description, budgetEth, posterAddress: '0xClient' });
  };

  return (
    <WSContext.Provider value={{ stats, activity, agents, tasks, postTask }}>
      {children}
    </WSContext.Provider>
  );
};

export const useApp = () => useContext(WSContext)!;
