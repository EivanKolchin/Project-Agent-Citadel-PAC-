import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { LuffaSDK } from '../lib/luffa';
import { Wallet, Key, Save, AlertCircle, RefreshCw } from 'lucide-react';
import { ethers } from 'ethers';

export const Settings = () => {
  const [address, setAddress] = useState<string>('');
  const [privateKeyInput, setPrivateKeyInput] = useState<string>('');
  const [balance, setBalance] = useState<string>('0.00');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  useEffect(() => {
    loadWalletData();
  }, []);

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

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Settings</h1>
        <p className="text-slate-400 text-sm">Manage your account preferences, payments, and keys.</p>
      </header>

      {/* PAYMENTS SECTION */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center space-x-2">
          <Wallet className="text-indigo-400" size={20} />
          <h2 className="text-lg font-semibold text-white">Payments & Wallet</h2>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* QR Code and Active Wallet */}
          <div className="flex flex-col items-center justify-center space-y-4 bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
            <h3 className="text-sm font-medium text-slate-300 w-full text-center">Receive Funds (Active Address)</h3>
            
            {address ? (
              <div className="bg-white p-3 rounded-xl shadow-inner">
                <QRCodeSVG value={address} size={150} level="H" />
              </div>
            ) : (
              <div className="w-[150px] h-[150px] bg-slate-800 animate-pulse rounded-xl flex items-center justify-center">
                <RefreshCw className="animate-spin text-slate-600" />
              </div>
            )}
            
            <div className="w-full text-center space-y-2">
              <p className="text-xs text-slate-400 font-mono break-all bg-slate-950 p-3 rounded-lg border border-slate-800 selection:bg-indigo-500/30">
                {address || 'Loading...'}
              </p>
              <div className="inline-flex items-center space-x-2 bg-indigo-500/10 text-indigo-400 text-sm py-1.5 px-4 rounded-full font-semibold border border-indigo-500/20">
                <Wallet size={14} />
                <span>Balance: {balance} ETH</span>
              </div>
            </div>
            
            <p className="text-xs text-slate-500 text-center max-w-[280px]">
              Use this QR code or address to fund your wallet for real task escrow payments.
            </p>
          </div>

          {/* Import Wallet Form */}
          <div className="space-y-5 flex flex-col justify-center">
            <div>
              <h3 className="text-sm font-medium text-slate-200 flex items-center space-x-2 mb-1">
                <Key size={16} className="text-emerald-400" />
                <span>Import Existing Wallet</span>
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Enter your private key to load a real EVM wallet for transactions instead of the randomly generated session wallet.
              </p>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Private Key</label>
                  <input 
                    type="password" 
                    value={privateKeyInput}
                    onChange={(e) => setPrivateKeyInput(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                  />
                </div>
                
                {statusMsg && (
                  <div className={`p-3 rounded-lg flex items-start space-x-2 text-sm ${statusMsg.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{statusMsg.text}</span>
                  </div>
                )}

                <div className="flex items-center space-x-3 pt-2">
                  <button 
                    onClick={handleImportWallet}
                    disabled={isLoading || !privateKeyInput}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-indigo-900/20"
                  >
                    <Save size={16} />
                    <span>Apply Private Key</span>
                  </button>
                  <button 
                    onClick={handleGenerateNew}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors border border-slate-700"
                    title="Generate a new random private key"
                  >
                    <RefreshCw size={16} />
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
