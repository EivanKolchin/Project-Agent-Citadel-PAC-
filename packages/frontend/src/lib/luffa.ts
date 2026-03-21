export interface LuffaIdentity {
  id: string;
  username: string;
  avatarUrl?: string;
}

class LuffaSDKWrapper {
  public readonly isLuffaEnvironment: boolean;

  constructor() {
    // Detect Luffa environment (e.g., via window.Luffa or user agent injection)
    this.isLuffaEnvironment = typeof (window as any).Luffa !== 'undefined';
  }

  async getWalletAddress(): Promise<string> {
    if (this.isLuffaEnvironment) {
      return await (window as any).Luffa.wallet.getAddress();
    }
    console.warn("[LuffaSDK] Not in Luffa environment. Mocking wallet address.");
    return "0xMockUserAddress4bF9590B228B0f0";
  }

  async signTransaction(tx: { to: string, value: string, data?: string }): Promise<string> {
    if (this.isLuffaEnvironment) {
      return await (window as any).Luffa.wallet.signTransaction(tx);
    }
    console.warn("[LuffaSDK] Mocking native transaction signature UI...");
    // Simulate native Luffa UI overlay delay for signing
    await new Promise(resolve => setTimeout(resolve, 800));
    const confirmed = window.confirm(`[Mock Luffa Native UI]\nConfirm payment of ${tx.value} ETH to ${tx.to}?`);
    if (!confirmed) throw new Error("User rejected transaction in Luffa UI");
    return `0xhash${Date.now()}`;
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
