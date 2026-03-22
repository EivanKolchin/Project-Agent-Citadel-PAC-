import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { LuffaSDK } from '../lib/luffa';
import { Wallet, Key, Save, AlertCircle, RefreshCw } from 'lucide-react';
import { ethers } from 'ethers';
import { useEthPrice } from '../hooks/useEthPrice';

export const Settings = () => {
  const [address, setAddress] = useState<string>('');
  const [privateKeyInput, setPrivateKeyInput] = useState<string>('');
  const [balance, setBalance] = useState<string>('0.00');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const [isDummyMode, setIsDummyMode] = useState<boolean>(false);
  const { formatUsd } = useEthPrice();

  useEffect(() => {
    setIsDummyMode(localStorage.getItem('dummy_mode') === 'true');
    const onStorageChange = () => setIsDummyMode(localStorage.getItem('dummy_mode') === 'true');
    window.addEventListener('storage', onStorageChange);
    return () => window.removeEventListener('storage', onStorageChange);
  }, []);

  useEffect(() => {
    loadWalletData();
  }, [isDummyMode]);

  const loadWalletData = async () => {
    try {
      const addr = await LuffaSDK.getWalletAddress();
      setAddress(addr);
      
      const provider = new ethers.JsonRpcProvider('http://localhost:8545');
      const bal = await provider.getBalance(addr);
      setBalance(parseFloat(ethers.formatEther(bal)).toFixed(4));
    } catch (e) {
      console.error(e);
    }
  };

  const handleImportWallet = async () => {
    if (!privateKeyInput) return;
    setIsLoading(true);
    setStatusMsg(null);
    try {
      const newAddr = await LuffaSDK.importPrivateKey(privateKeyInput);
      setAddress(newAddr);
      setPrivateKeyInput('');
      localStorage.removeItem('dummy_mode');
      window.dispatchEvent(new Event('storage'));
      setStatusMsg({ type: 'success', text: 'Wallet updated successfully! You can now perform real transactions.' });
      loadWalletData();
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateNew = () => {
    const wallet = ethers.Wallet.createRandom();
    setPrivateKeyInput(wallet.privateKey);
  };

  const handleSeedFunds = async () => {
    setIsLoading(true);
    setStatusMsg(null);
    try {
      // Create a random wallet if address is not present to allow seeding without wallet setup
      const targetAddress = address || ethers.Wallet.createRandom().address;
      await LuffaSDK.requestFaucetFunds(targetAddress);
      
      localStorage.setItem('dummy_mode', 'true');
      setIsDummyMode(true);
      
      // If we didn't have a wallet, we might want to automatically log them in with a new key
      // but the user just asked "make it not need wallet id". We can generate a new wallet on the fly and save it.
      if (!address) {
        const wallet = ethers.Wallet.createRandom();
        localStorage.setItem('luffa_agent_key', wallet.privateKey);
      }
      
      window.dispatchEvent(new Event('storage'));
      setStatusMsg({ type: 'success', text: 'Success! Your wallet was seeded with 10 Dummy ETH.' });
      loadWalletData();
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: 'Faucet failed: ' + e.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20 animate-fade-in">
      <header>
        <h1 className="text-3xl font-light tracking-tight text-white mb-2">Settings</h1>
        <p className="text-zinc-400 text-sm">Manage your account preferences, payments, and keys.</p>
      </header>

      {/* PAYMENTS SECTION */}
      <section className="bg-zinc-900/40 border border-white/5 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-white/5 bg-zinc-900/30 flex items-center space-x-3">
          <Wallet className="text-zinc-400" size={20} />
          <h2 className="text-sm font-semibold tracking-wider text-zinc-300 uppercase">Payments & Wallet</h2>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* QR Code and Active Wallet */}
          <div className="flex flex-col items-center justify-center space-y-5 bg-white/[0.02] p-8 rounded-2xl border border-white/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest w-full text-center relative z-10">Receive Funds</h3>
            
            {address ? (
              <div className="bg-white p-4 rounded-2xl shadow-xl transform transition-transform hover:scale-[1.02] relative z-10">
                <QRCodeSVG value={address} size={160} level="H" />
              </div>
            ) : (
              <div className="w-[160px] h-[160px] bg-white/5 animate-pulse rounded-2xl flex items-center justify-center relative z-10">
                <RefreshCw className="animate-spin text-zinc-600" />
              </div>
            )}
            
            <div className="w-full text-center space-y-3 relative z-10">
              <p className="text-xs text-zinc-400 font-mono break-all bg-black/40 p-3 rounded-xl border border-white/5 selection:bg-white/20">
                {address || 'Loading...'}
              </p>
              <div className="inline-flex flex-col items-center justify-center bg-white/5 py-2 px-6 rounded-xl border border-white/10">
                <div className="flex items-center space-x-2 text-zinc-300 font-medium">
                  <Wallet size={14} className="text-zinc-500" />
                  <span>{balance} ETH</span>
                </div>
                <span className="text-[10px] text-zinc-500 mt-0.5">{formatUsd(balance)}</span>
              </div>
            </div>
            
            {isDummyMode ? (
              <button
                onClick={() => {
                  localStorage.removeItem('dummy_mode');
                  setIsDummyMode(false);
                  window.dispatchEvent(new Event('storage'));
                  setStatusMsg({ type: 'success', text: 'Returned to Normal Mode.' });
                }}
                className="mt-4 text-xs bg-zinc-800 text-white hover:bg-zinc-700 border border-white/10 font-semibold py-2.5 px-5 rounded-xl transition-all shadow-lg relative z-10"
              >
                Return to Normal Mode
              </button>
            ) : (
              <button
                onClick={handleSeedFunds}
                disabled={isLoading || parseFloat(balance) > 0}
                className="mt-4 text-xs bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:bg-white/10 disabled:text-zinc-500 disabled:cursor-not-allowed font-semibold py-2.5 px-5 rounded-xl transition-all shadow-lg relative z-10"
              >
                Seed 10 Dummy ETH
              </button>
            )}
          </div>

          {/* Import Wallet Form */}
          <div className="space-y-6 flex flex-col justify-center max-w-sm">
            <div>
              <h3 className="text-sm font-semibold text-zinc-300 flex items-center space-x-2 mb-2 uppercase tracking-wide">
                <Key size={16} className="text-zinc-500" />
                <span>Import Wallet</span>
              </h3>
              <p className="text-xs text-zinc-500 font-light leading-relaxed mb-5">
                Load a real EVM wallet via private key. This replaces the randomly generated session wallet.
              </p>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <input 
                    type="password" 
                    value={privateKeyInput}
                    onChange={(e) => setPrivateKeyInput(e.target.value)}
                    placeholder="Enter Private Key (0x...)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all font-mono placeholder:text-zinc-600"
                  />
                </div>
                
                {statusMsg && (
                  <div className={`p-4 rounded-xl flex items-start space-x-3 text-sm ${statusMsg.type === 'error' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <span className="leading-snug">{statusMsg.text}</span>
                  </div>
                )}

                <div className="flex items-center space-x-3 pt-2">
                  <button 
                    onClick={handleImportWallet}
                    disabled={isLoading || !privateKeyInput}
                    className="flex-1 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:bg-white/10 disabled:text-zinc-500 disabled:cursor-not-allowed text-sm font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-white/5"
                  >
                    <Save size={16} />
                    <span>Apply Key</span>
                  </button>
                  <button 
                    onClick={handleGenerateNew}
                    className="p-3 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-xl transition-all border border-white/10"
                    title="Generate Random"
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </section>
    </div>
  );
};
