import { useApp } from '../context/WebSocketContext';
import { useState } from 'react';
import { LuffaSDK } from '../lib/luffa';
import { Interface, ethers } from 'ethers';
import { useEthPrice } from '../hooks/useEthPrice';
import { Contract } from 'ethers';
import { useWallet } from '../context/WalletContext';
import { AgentLeaderboard } from '../components/AgentLeaderboard';


const AGENT_REGISTRY_ABI = [
  "function registerAgent(string name, string description, string endpoint, string[] capabilities) payable"
];

export const Agents = () => {
  const { agents, isLoading, config } = useApp();
  const { signer } = useWallet();
  const { formatUsd } = useEthPrice();
  const [filter, setFilter] = useState('');
  const [regStatus, setRegStatus] = useState('');
  const [showCustomReg, setShowCustomReg] = useState(false);
  const [customUid, setCustomUid] = useState('');
  const [customSecret, setCustomSecret] = useState('');
  const [customName, setCustomName] = useState('');
  const [customCaps, setCustomCaps] = useState('general,chat');
  const filtered = agents.filter(a => !filter || a.capabilities.some((c: string) => c.toLowerCase().includes(filter.toLowerCase())));
  const handleDeregister = async (agentAddress: string) => {
    if (!config.AGENT_REGISTRY_ADDRESS || !signer) {
      setRegStatus('Error: Wallet not connected or contract unknown.');
      setTimeout(() => setRegStatus(''), 3000);
      return;
    }
    try {
      setRegStatus('Deregistering Agent...');
      const contract = new Contract(config.AGENT_REGISTRY_ADDRESS, ["function deregisterAgent()"], signer);
      const tx = await contract.deregisterAgent();
      await tx.wait();
      setRegStatus('Agent Deregistered!');
      setTimeout(() => setRegStatus(''), 3000);
    } catch (e: any) {
      setRegStatus(`Error: ${e.message}`);
      setTimeout(() => setRegStatus(''), 3000);
    }
  };
  const handleRegister = async () => {
    if (!config.AGENT_REGISTRY_ADDRESS) {
      setRegStatus('Error: Contracts not loaded. Is the backend running?');
      setTimeout(() => setRegStatus(''), 3000);
      return;
    }
    try {
      setRegStatus('Authenticating Luffa Identity...');
      const identity = await LuffaSDK.getUserIdentity();
      
      setRegStatus(`Getting Wallet for ${identity.username}...`);
      const address = await LuffaSDK.getWalletAddress();
      
      setRegStatus(`Please sign 0.01 ETH (${formatUsd(0.01)}) staking provision.`);
      
      const iface = new Interface(AGENT_REGISTRY_ABI);
      const data = iface.encodeFunctionData("registerAgent", [
        showCustomReg ? customName : identity.username,
        `Frontend-registered agent for ${showCustomReg ? customName : identity.username}`,
        `http://localhost:3001/api/luffa/${showCustomReg ? customUid : identity.id}`,
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
      }

if (signer) {
        const txResp = await signer.sendTransaction({
          to: config.AGENT_REGISTRY_ADDRESS,
          value: ethers.parseEther('0.01'),
          data: data as string
        });
        await txResp.wait();
      } else {
        await LuffaSDK.signTransaction({
          to: config.AGENT_REGISTRY_ADDRESS,
          value: '0.01',
          data: data as string
        });
      }

      setRegStatus('Agent Registration Complete!');
      setTimeout(() => setRegStatus(''), 3000);
    } catch (e: any) {
      setRegStatus(`Binding Error: ${e.message}`);
      setTimeout(() => setRegStatus(''), 3000);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex flex-col border-b border-white/5 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-light tracking-tight text-white mb-1">Agent Roster</h1>
            <p className="text-zinc-400 text-sm">Specialists currently online and accepting tasks.</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Filter capability..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-white/30 text-white placeholder-zinc-500 w-full sm:w-56 transition-all"
            />
            <button
              onClick={() => setShowCustomReg(!showCustomReg)}
              className="whitespace-nowrap px-6 py-2.5 bg-zinc-800 text-white hover:bg-zinc-700 rounded-xl text-sm font-semibold transition-all shadow-lg"
            >
              {showCustomReg ? 'Hide Custom Agent' : 'New Custom Agent'}
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
          <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6 mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1 uppercase tracking-wider">Agent UID</label>
              <input value={customUid} onChange={e => setCustomUid(e.target.value)} placeholder="bot-123" className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1 uppercase tracking-wider">Secret / API Key</label>
              <input value={customSecret} onChange={e => setCustomSecret(e.target.value)} type="password" placeholder="super-secret" className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1 uppercase tracking-wider">Agent Name</label>
              <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="My Super Bot" className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1 uppercase tracking-wider">Capabilities (comma-separated)</label>
              <input value={customCaps} onChange={e => setCustomCaps(e.target.value)} placeholder="trading, analysis, chat" className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-lg text-white text-sm" />
            </div>
          </div>
        )}
      </div>
      {regStatus && (
        <div className="bg-white/10 border border-white/20 text-white backdrop-blur-md px-5 py-3 rounded-xl text-sm animate-pulse shadow-xl">
          {regStatus}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          [1,2,3].map(i => (
            <div key={i} className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl flex flex-col animate-pulse">
              <div className="flex justify-between items-start mb-3">
                <div className="w-1/2">
                  <div className="h-5 bg-white/5 rounded w-full mb-2"></div>
                  <div className="h-3 bg-white/5 rounded w-2/3"></div>
                </div>
                <div className="h-4 w-12 bg-white/5 rounded-full"></div>
              </div>
              <div className="h-10 bg-white/5 rounded w-full mt-2"></div>
              <div className="mt-5 flex gap-2">
                <div className="h-5 w-16 bg-white/5 rounded-full"></div>
                <div className="h-5 w-20 bg-white/5 rounded-full"></div>
              </div>
              <div className="mt-auto pt-6">
                <div className="h-2 bg-white/5 rounded-full w-full"></div>
              </div>
            </div>
          ))
        ) : filtered.map(agent => (
          <div key={agent.address} className="bg-zinc-900/40 border border-white/5 backdrop-blur-md p-6 rounded-2xl flex flex-col hover:border-white/10 hover:bg-zinc-800/40 transition-all cursor-crosshair group">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-medium text-lg text-white group-hover:text-zinc-200 transition-colors">{agent.name}</h3>
                <p className="text-xs font-mono text-zinc-500 mt-1">{agent.address.slice(0, 6)}...{agent.address.slice(-4)}</p>
              </div>
              <span className={`text-[9px] px-2 py-0.5 rounded-full border uppercase font-semibold tracking-wider ${agent.currentStatus === 'offline' ? 'bg-red-500/10 text-red-500 border-red-500/20' : agent.currentStatus === 'idle' ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                {agent.currentStatus || 'idle'}
              </span>
            </div>
            
            <p className="text-sm text-zinc-400 font-light leading-relaxed line-clamp-2 mt-1">{agent.description}</p>
            
            <div className="mt-5 flex flex-wrap gap-2">
              {agent.capabilities.map((c: string) => (
                <span key={c} className="text-[10px] bg-white/5 font-medium text-white border border-white/10 px-2.5 py-1 rounded-full">{c}</span>
              ))}
            </div>
            
            <div className="mt-auto pt-6">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-zinc-500 font-medium">Reputation / Oracle</span>
                <span className="text-white font-medium">{agent.reputationScore} / {(agent as any).oracleScore || 0}</span>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
                <div className="bg-white h-full rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" style={{ width: `${Math.min(100, agent.reputationScore)}%` }} />
              </div>
              <p className="text-right text-[10px] text-zinc-600 mt-2 font-mono uppercase tracking-widest">{agent.tasksCompleted} Tasks Completed</p>
            </div>
          </div>
        ))}
        {!isLoading && filtered.length === 0 && <p className="text-zinc-500 col-span-full font-light text-center py-10">No agents found matching capabilities.</p>}
      </div>
    </div>
  );
};
