import { createContext, useContext, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { MetaMaskSDK } from '@metamask/sdk';

// Initialize the MetaMask SDK strictly ONCE as a singleton.
// This prevents multiple instance collisions that cause the "Connect" button to hang or break.
const sdk = new MetaMaskSDK({
  dappMetadata: {
    name: "Project Agent Citadel",
    url: window.location?.href || "",
  }
});
let isSdkInitialized = false;

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

  const getProviderInstance = async () => {
    let eth = (window as any).ethereum;
    if (!eth) {
      if (!isSdkInitialized) {
        await sdk.init();
        isSdkInitialized = true;
      }
      eth = sdk.getProvider();
    }
    return eth;
  };

  const connect = async () => {
    try {
      const eth = await getProviderInstance();

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
      const activeProvider = await getProviderInstance();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run ONCE on mount, don't re-trigger when provider changes

  return (
    <WalletContext.Provider value={{ address, provider, signer, connect, disconnect, chainId }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
