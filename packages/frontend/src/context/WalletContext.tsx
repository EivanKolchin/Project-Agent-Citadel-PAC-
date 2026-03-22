import { createContext, useContext, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { MetaMaskSDK } from '@metamask/sdk';

interface WalletState {
  address: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  chainId: number | null;
}

const WalletContext = createContext<WalletState>({
  address: null,
  provider: null,
  signer: null,
  connect: async () => {},
  disconnect: () => {},
  chainId: null
});

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);      
  const [chainId, setChainId] = useState<number | null>(null);

  const connect = async () => {
    try {
      const MMSDK = new MetaMaskSDK({
        dappMetadata: {
          name: "Internet of Agents",
          url: window.location.href,
        },
      });
      await MMSDK.init();

      const eth = MMSDK.getProvider() || (window as any).ethereum;

      if (!eth) {
        alert("Please install MetaMask or another Web3 wallet.");
        return;
      }

      const wProvider = new ethers.BrowserProvider(eth);
      const accounts = await wProvider.send("eth_requestAccounts", []);
      if (accounts.length > 0) {
        const wSigner = await wProvider.getSigner();
        const network = await wProvider.getNetwork();

        setProvider(wProvider);
        setSigner(wSigner);
        setAddress(accounts[0]);
        setChainId(Number(network.chainId));
        localStorage.removeItem('dummy_mode');
        window.dispatchEvent(new Event('storage'));
      }
    } catch (e) {
      console.error("Wallet connection failed:", e);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setProvider(null);
    setSigner(null);
    setChainId(null);
  };

  useEffect(() => {
    const initWeb3 = async () => {
      let activeProvider = (window as any).ethereum;

      if (!activeProvider) {
         try {
           const MMSDK = new MetaMaskSDK({
             dappMetadata: { name: "Internet of Agents", url: window.location.href }
           });
           await MMSDK.init();
           activeProvider = MMSDK.getProvider();
         } catch(e) { }
      }

      if (activeProvider) {
        // Auto connect if accounts are already authorized
        activeProvider.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
          if (accounts.length > 0) {
            const wProvider = new ethers.BrowserProvider(activeProvider);       
            wProvider.getSigner().then((wSigner) => {
              setProvider(wProvider);
              setSigner(wSigner);
              setAddress(accounts[0]);
              wProvider.getNetwork().then((n) => setChainId(Number(n.chainId)));

              localStorage.removeItem('dummy_mode');
              window.dispatchEvent(new Event('storage'));
            });
          }
        }).catch(console.error);

        activeProvider.on('accountsChanged', (accounts: string[]) => {
          if (accounts.length > 0) {
            setAddress(accounts[0]);
            // Refresh signer
            if (provider) {
               provider.getSigner().then(setSigner);
            }
          } else {
            disconnect();
          }
        });
        activeProvider.on('chainChanged', (cId: string) => setChainId(Number(cId)));
      }
    };
    if (typeof window !== 'undefined') {
      initWeb3();
    }
  }, [provider]);

  return (
    <WalletContext.Provider value={{ address, provider, signer, connect, disconnect, chainId }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
