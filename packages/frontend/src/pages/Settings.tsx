import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { LuffaSDK } from '../lib/luffa';
import { Wallet, Key, Save, AlertCircle, RefreshCw, User, LogOut, Shield } from 'lucide-react';
import { ethers } from 'ethers';
import { useEthPrice } from '../hooks/useEthPrice';
import { useWallet } from '../context/WalletContext';
import { QRCodeSVG } from 'qrcode.react';

export const Settings = () => {
  const { address: walletAddress, provider: walletProvider, chainId } = useWallet();
  const [address, setAddress] = useState<string>('');
  const [privateKeyInput, setPrivateKeyInput] = useState<string>('');
  const [balance, setBalance] = useState<string>('0.00');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const [isQrExpanded, setIsQrExpanded] = useState<boolean>(false);
  const [profileName, setProfileName] = useState<string>(localStorage.getItem('pac_profile_name') || 'Agent Operator');
  const [profileEmail, setProfileEmail] = useState<string>(localStorage.getItem('pac_profile_email') || 'operator@pac.network');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(localStorage.getItem('pac_logged_in') === 'true');
  const { formatUsd } = useEthPrice();
  const location = useLocation();

  useEffect(() => {
    loadWalletData();
  }, [walletAddress, walletProvider]);

  const loadWalletData = async () => {
    try {
      if (walletAddress && walletProvider) {
        setAddress(walletAddress);
        const bal = await walletProvider.getBalance(walletAddress);
        setBalance(parseFloat(ethers.formatEther(bal)).toFixed(4));
        return;
      }

      const addr = await LuffaSDK.getWalletAddress();
      setAddress(addr);
      
      const ethProvider = new ethers.JsonRpcProvider('http://localhost:8545');
      const bal = await ethProvider.getBalance(addr);
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

  const handleSaveProfile = () => {
    localStorage.setItem('pac_profile_name', profileName);
    localStorage.setItem('pac_profile_email', profileEmail);
    if (passwordInput) {
      // In a real app this wouldn't be plaintext, but for UI mockup/demo logic:
      localStorage.setItem('pac_profile_pwd', btoa(passwordInput));
      setPasswordInput('');
    }
    setStatusMsg({ type: 'success', text: 'Profile updated successfully.' });
  };

  const handleAuth = (action: 'login' | 'logout' | 'register') => {
    if (action === 'logout') {
      localStorage.setItem('pac_logged_in', 'false');
      setIsLoggedIn(false);
      setStatusMsg({ type: 'success', text: 'Signed out successfully.' });
    } else {
      localStorage.setItem('pac_logged_in', 'true');
      setIsLoggedIn(true);
      if (action === 'register') {
        setStatusMsg({ type: 'success', text: 'Account created and signed in.' });
      } else {
        setStatusMsg({ type: 'success', text: 'Signed in successfully.' });
      }
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20 animate-fade-in">
      <header>
        <h1 className="text-3xl font-light tracking-tight text-white mb-2">Settings</h1>
        <p className="text-zinc-400 text-sm">Manage your account preferences, payments, and keys.</p>
      </header>

      {/* PROFILE & AUTHENTICATION SECTION */}
      <section className="bg-zinc-900/40 border border-white/5 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-white/5 bg-zinc-900/30 flex items-center space-x-3">
          <User className="text-zinc-400" size={20} />
          <h2 className="text-sm font-semibold tracking-wider text-zinc-300 uppercase">Account Settings</h2>
        </div>
        
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-5">
              <h3 className="text-sm font-medium text-white flex items-center space-x-2">
                <Shield size={16} className="text-indigo-400" />
                <span>Profile Details</span>
              </h3>
              
              {!isLoggedIn ? (
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3">
                  <User size={32} className="text-zinc-600 mb-2" />
                  <p className="text-sm font-medium text-zinc-300">Authentication Required</p>
                  <p className="text-xs text-zinc-500 max-w-xs">Please sign in or create an account to view and edit your profile details.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5 uppercase font-semibold tracking-wider">Display Name</label>
                      <input 
                        type="text" 
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="Enter your name"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all placeholder:text-zinc-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5 uppercase font-semibold tracking-wider">Email Address</label>
                      <input 
                        type="email" 
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all placeholder:text-zinc-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5 uppercase font-semibold tracking-wider">New Password</label>
                      <input 
                        type="password" 
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="Leave blank to keep current"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all font-mono placeholder:text-zinc-600"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleSaveProfile}
                    className="bg-indigo-600 text-white hover:bg-indigo-500 text-sm font-semibold py-2.5 px-6 rounded-xl transition-all shadow-lg flex items-center space-x-2"
                  >
                    <Save size={16} />
                    <span>Save Changes</span>
                  </button>
                </>
              )}
            </div>

            <div className="w-full md:w-64 bg-white/5 rounded-2xl border border-white/5 p-6 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-indigo-500/20 border-2 border-indigo-500/50 flex items-center justify-center mb-2">
                <User size={32} className="text-indigo-400" />
              </div>
              
              {!isLoggedIn ? (
                <>
                  <p className="text-xs text-zinc-400">Sign in to manage your profile and preferences.</p>
                  <div className="w-full space-y-3 pt-2">
                    <button 
                      onClick={() => handleAuth('login')}
                      className="w-full bg-white text-black hover:bg-zinc-200 text-sm font-semibold py-2.5 px-4 rounded-xl transition-all"
                    >
                      Sign In
                    </button>
                    <button 
                      onClick={() => handleAuth('register')}
                      className="w-full bg-transparent text-white border border-white/20 hover:bg-white/10 text-sm font-semibold py-2.5 px-4 rounded-xl transition-all"
                    >
                      Create Account
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h4 className="font-semibold text-white">{profileName}</h4>
                    <p className="text-xs text-zinc-400 truncate w-48">{profileEmail}</p>
                  </div>
                  <button 
                    onClick={() => handleAuth('logout')}
                    className="w-full bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 text-sm font-semibold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center space-x-2 mt-4"
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* PAYMENTS SECTION */}
      <section className="bg-zinc-900/40 border border-white/5 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-white/5 bg-zinc-900/30 flex items-center space-x-3">
          <Wallet className="text-zinc-400" size={20} />
          <h2 className="text-sm font-semibold tracking-wider text-zinc-300 uppercase">Payments & Wallet</h2>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Active Wallet */}
          <div className="flex flex-col items-center justify-center space-y-5 bg-white/[0.02] p-8 rounded-2xl border border-white/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest w-full text-center relative z-10">Active Network Wallet</h3>
            
            {address ? (
              <>
                <div 
                  className="bg-white rounded-2xl shadow-xl transition-all duration-300 cursor-pointer relative z-10 p-4 transform hover:scale-[1.02] hover:shadow-indigo-500/20"
                  onClick={() => setIsQrExpanded(true)}
                  title="Click to Enlarge"
                >
                  <QRCodeSVG value={address} size={160} level="H" />
                </div>
                
                {/* Centered Expanded Modal */}
                {isQrExpanded && (
                  <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    onClick={() => setIsQrExpanded(false)}
                  >
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-300" />
                    <div 
                      className="bg-white p-8 rounded-3xl shadow-2xl relative z-10 animate-in zoom-in-90 fade-in duration-300 ease-out"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <QRCodeSVG value={address} size={320} level="H" />
                      <p className="text-center text-zinc-500 text-xs mt-4 font-semibold uppercase tracking-widest">Scan to Send Funds</p>
                      <button 
                        onClick={() => setIsQrExpanded(false)}
                        className="absolute -top-4 -right-4 bg-zinc-800 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-zinc-700 hover:scale-110 transition-all border-2 border-zinc-900 shadow-xl"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="w-[160px] h-[160px] bg-white/5 animate-pulse rounded-2xl flex items-center justify-center relative z-10">
                <RefreshCw className="animate-spin text-zinc-600" />
              </div>
            )}
            
            <div className="w-full text-center flex flex-col items-center space-y-3 relative z-10">
              <p className="text-xs text-zinc-400 font-mono break-all bg-black/40 p-3 rounded-xl border border-white/5 selection:bg-white/20">
                {address || 'Loading...'}
              </p>
              
              <div className="flex items-center justify-center space-x-2 w-full max-w-[240px]">
                <div className="flex-1 inline-flex flex-col items-center justify-center bg-white/5 py-2 px-3 rounded-xl border border-white/10">
                  <div className="flex items-center space-x-1.5 text-zinc-300 font-medium text-sm">
                    <Wallet size={14} className="text-zinc-500" />
                    <span>{balance} ETH</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 mt-0.5">{formatUsd(balance)}</span>
                </div>

                {chainId && (
                  <div className="inline-flex flex-col items-center justify-center bg-white/5 py-2 px-3 rounded-xl border border-white/10">
                    <div className="flex items-center space-x-1.5 text-zinc-300 font-medium text-sm">
                      <Shield size={14} className="text-zinc-500" />
                      <span>Network</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 mt-0.5 font-mono">ID: {chainId}</span>
                  </div>
                )}
              </div>
            </div>
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
