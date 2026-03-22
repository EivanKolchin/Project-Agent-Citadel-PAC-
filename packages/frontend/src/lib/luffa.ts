import { ethers } from 'ethers';

export interface LuffaIdentity {
  id: string;
  username: string;
  avatarUrl?: string;
}

class LuffaSDKWrapper {
  public readonly isLuffaEnvironment: boolean;
  private mockWallet: ethers.Wallet | null = null;
  private provider = new ethers.JsonRpcProvider('http://localhost:8545');

  constructor() {
    this.isLuffaEnvironment = typeof (window as any).Luffa !== 'undefined';
    if (!this.isLuffaEnvironment) {
      this.initMockWallet();
    }
  }

  // Allow users to manually set their wallet via private key for real transactions
  public async importPrivateKey(pk: string) {
    try {
      this.mockWallet = new ethers.Wallet(pk, this.provider);
      localStorage.setItem('luffa_mock_pk', pk);
      console.log("[LuffaSDK] Imported new wallet:", this.mockWallet.address);
      return this.mockWallet.address;
    } catch (e: any) {
      throw new Error(`Invalid Private Key: ${e.message}`);
    }
  }

  private async initMockWallet() {
    try {
      let pk = localStorage.getItem('luffa_mock_pk');
      if (!pk) {
        const wallet = ethers.Wallet.createRandom();
        pk = wallet.privateKey;
        localStorage.setItem('luffa_mock_pk', pk);
      }
      this.mockWallet = new ethers.Wallet(pk, this.provider);
      console.log("[LuffaSDK] Initialized mock wallet:", this.mockWallet.address);
    } catch (e) {
      console.warn("[LuffaSDK] Offline or failed to init wallet:", e);
    }
  }

  async getWalletAddress(): Promise<string> {
    if (this.isLuffaEnvironment) {
      return await (window as any).Luffa.wallet.getAddress();
    }
    if (this.mockWallet) return this.mockWallet.address;
    return "0xMockUserAddress4bF9590B228B0f0";
  }

  async signTransaction(tx: { to: string, value: string, data?: string }): Promise<string> {
    if (this.isLuffaEnvironment) {
      return await (window as any).Luffa.wallet.signTransaction(tx);
    }
    
    if (!this.mockWallet) {
      throw new Error("Mock wallet not initialized. Is the local blockchain running?");
    }

    const txValue = ethers.parseEther(tx.value);
    const balance = await this.provider.getBalance(this.mockWallet.address);

    const formattedBalance = parseFloat(ethers.formatEther(balance));
    
    if (balance < txValue) {
      alert(`Insufficient funds!\nYou have ${formattedBalance.toFixed(4)} ETH but need ${tx.value} ETH to post this task.`);
      throw new Error(`Insufficient funds: ${formattedBalance} ETH`);
    }

    // Simulate native Luffa UI overlay delay for signing
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const confirmed = window.confirm(`[Mock Luffa Native UI]\nConfirm REAL payment of ${tx.value} ETH to ${tx.to}?\n\nWallet Balance: ${formattedBalance.toFixed(3)} ETH`);
    if (!confirmed) throw new Error("User rejected transaction in Luffa UI");

    try {
      const txResponse = await this.mockWallet.sendTransaction({
        to: tx.to,
        value: txValue,
        data: tx.data
      });
      console.log("[LuffaSDK] Transaction broadcasted:", txResponse.hash);
      await txResponse.wait();
      return txResponse.hash;
    } catch (e: any) {
      console.error("Failed to execute on-chain transaction:", e);
      throw new Error(`Transaction failed: ${e.message}`);
    }
  }

  async getUserIdentity(): Promise<LuffaIdentity> {
    if (this.isLuffaEnvironment) {
      return await (window as any).Luffa.identity.getUser();
    }
    return {
      id: "luffa_dev_123",
      username: "LuffaDeveloper"
    };
  }
}

export const LuffaSDK = new LuffaSDKWrapper();

