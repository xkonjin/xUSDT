/**
 * Wallet Connection Utilities
 * 
 * Supports multiple wallet providers including:
 * - Rabby Wallet (mobile and desktop)
 * - MetaMask
 * - Coinbase Wallet
 * - Other EIP-1193 compatible wallets
 * 
 * Optimized for mobile devices with touch-friendly interactions.
 */

/**
 * EIP-1193 compatible provider interface
 */
export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  isRabby?: boolean;
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
}

/**
 * Wallet detection result
 */
export interface WalletInfo {
  provider: Eip1193Provider;
  name: string;
  isMobile: boolean;
}

/**
 * Detect available wallet providers
 * 
 * Checks for Rabby, MetaMask, Coinbase Wallet, and other EIP-1193 providers
 * in order of preference for mobile compatibility.
 */
export function detectWallet(): WalletInfo | null {
  if (typeof window === "undefined") return null;

  const ethereum = (window as any).ethereum;

  if (!ethereum) {
    return null;
  }

  // Check for Rabby Wallet (mobile-friendly, supports multiple chains)
  if (ethereum.isRabby) {
    return {
      provider: ethereum as Eip1193Provider,
      name: "Rabby Wallet",
      isMobile: /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent),
    };
  }

  // Check for MetaMask
  if (ethereum.isMetaMask) {
    return {
      provider: ethereum as Eip1193Provider,
      name: "MetaMask",
      isMobile: /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent),
    };
  }

  // Check for Coinbase Wallet
  if (ethereum.isCoinbaseWallet) {
    return {
      provider: ethereum as Eip1193Provider,
      name: "Coinbase Wallet",
      isMobile: /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent),
    };
  }

  // Generic EIP-1193 provider (could be Rabby or others)
  if (ethereum.request) {
    return {
      provider: ethereum as Eip1193Provider,
      name: "Ethereum Wallet",
      isMobile: /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent),
    };
  }

  return null;
}

/**
 * Connect to wallet
 * 
 * Requests account access from the detected wallet provider.
 * Works with Rabby, MetaMask, and other EIP-1193 wallets.
 */
export async function connectWallet(): Promise<string | null> {
  const wallet = detectWallet();

  if (!wallet) {
    throw new Error("No wallet detected. Please install Rabby Wallet or MetaMask.");
  }

  try {
    // Request account access (EIP-1193 standard)
    const accounts = (await wallet.provider.request({
      method: "eth_requestAccounts",
    })) as string[];

    if (accounts && accounts.length > 0) {
      return accounts[0];
    }

    return null;
  } catch (error: any) {
    if (error.code === 4001) {
      // User rejected the request
      throw new Error("Wallet connection rejected");
    }
    throw new Error(`Wallet connection failed: ${error.message || String(error)}`);
  }
}

/**
 * Get current connected account
 */
export async function getCurrentAccount(): Promise<string | null> {
  const wallet = detectWallet();

  if (!wallet) {
    return null;
  }

  try {
    const accounts = (await wallet.provider.request({
      method: "eth_accounts",
    })) as string[];

    if (accounts && accounts.length > 0) {
      return accounts[0];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Check if wallet is connected
 */
export async function isWalletConnected(): Promise<boolean> {
  const account = await getCurrentAccount();
  return account !== null;
}

/**
 * Switch to Plasma chain (chain ID 9745)
 * 
 * Rabby Wallet and MetaMask support chain switching.
 */
export async function switchToPlasmaChain(): Promise<void> {
  const wallet = detectWallet();

  if (!wallet) {
    throw new Error("No wallet detected");
  }

  const PLASMA_CHAIN_ID = 9745; // Plasma mainnet

  try {
    // Try to switch to Plasma chain
    await wallet.provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${PLASMA_CHAIN_ID.toString(16)}` }],
    });
  } catch (switchError: any) {
    // Chain not added, try to add it
    if (switchError.code === 4902) {
      try {
        await wallet.provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: `0x${PLASMA_CHAIN_ID.toString(16)}`,
              chainName: "Plasma",
              nativeCurrency: {
                name: "ETH",
                symbol: "ETH",
                decimals: 18,
              },
              rpcUrls: ["https://rpc.plasma.to"],
              blockExplorerUrls: ["https://explorer.plasma.to"],
            },
          ],
        });
      } catch (addError) {
        throw new Error("Failed to add Plasma chain to wallet");
      }
    } else {
      throw switchError;
    }
  }
}

/**
 * Get wallet provider name for display
 */
export function getWalletName(): string {
  const wallet = detectWallet();
  return wallet?.name || "No Wallet";
}

/**
 * Check if running on mobile device
 */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
}

/**
 * Setup wallet event listeners
 * 
 * Listens for account changes and chain changes.
 * Useful for updating UI when user switches accounts or chains.
 */
export function setupWalletListeners(
  onAccountsChanged: (accounts: string[]) => void,
  onChainChanged: (chainId: string) => void
): () => void {
  const wallet = detectWallet();

  if (!wallet) {
    return () => {}; // No-op cleanup
  }

  // Listen for account changes
  const handleAccountsChanged = (accounts: string[]) => {
    onAccountsChanged(accounts);
  };

  // Listen for chain changes
  const handleChainChanged = (chainId: string) => {
    onChainChanged(chainId);
  };

  // Add listeners (EIP-1193 providers may not have 'on' method)
  if ("on" in wallet.provider && typeof wallet.provider.on === "function") {
    wallet.provider.on("accountsChanged", handleAccountsChanged);
    wallet.provider.on("chainChanged", handleChainChanged);
  }

  // Return cleanup function
  return () => {
    if ("removeListener" in wallet.provider && typeof wallet.provider.removeListener === "function") {
      wallet.provider.removeListener("accountsChanged", handleAccountsChanged);
      wallet.provider.removeListener("chainChanged", handleChainChanged);
    }
  };
}

