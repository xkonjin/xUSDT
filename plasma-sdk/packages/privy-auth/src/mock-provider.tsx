/**
 * Mock Privy Provider for Local Development
 * 
 * Provides fake wallet/auth state so you can preview UI without Privy configured.
 * Only used when NEXT_PUBLIC_PRIVY_APP_ID is not set and NODE_ENV === 'development'
 */

"use client";

import { ReactNode, createContext, useContext, useState } from "react";
import type { Address, Hex } from "viem";
import type { ConnectedWallet } from "@privy-io/react-auth";
import type { PlasmaEmbeddedWallet } from "./types";

// Mock wallet address from main .env (Client wallet)
const MOCK_WALLET_ADDRESS = "0xa7C542386ddA8A4edD9392AB487ede0507bDD281" as Address;
const MOCK_USER_EMAIL = "dev@test.local";

export interface MockWalletContextType {
  user: { email?: { address: string } } | null;
  authenticated: boolean;
  ready: boolean;
  wallet: PlasmaEmbeddedWallet | null;
  login: () => void;
  logout: () => Promise<void>;
  linkEmail: () => void;
  linkPhone: () => void;
}

export const MockWalletContext = createContext<MockWalletContextType | null>(null);

export function MockPrivyProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(true); // Start logged in for dev

  const mockWallet: PlasmaEmbeddedWallet = {
    address: MOCK_WALLET_ADDRESS,
    connectedWallet: {
      address: MOCK_WALLET_ADDRESS,
      walletClientType: "privy",
    } as ConnectedWallet,
    signTypedData: async () => {
      // Simulate signing delay
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log("Mock signature requested");
      return "0xmocksignature1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678" as Hex;
    },
    switchChain: async () => {
      console.log("[Mock] Switching chain...");
    },
    getBalance: async () => {
      // Return 100 USDT0 (6 decimals)
      return BigInt(100_000_000);
    },
  };

  const value: MockWalletContextType = {
    user: authenticated ? { email: { address: MOCK_USER_EMAIL } } : null,
    authenticated,
    ready: true,
    wallet: authenticated ? mockWallet : null,
    login: () => setAuthenticated(true),
    logout: async () => { setAuthenticated(false); },
    linkEmail: () => { console.log("[Mock] Link email"); },
    linkPhone: () => { console.log("[Mock] Link phone"); },
  };

  return (
    <MockWalletContext.Provider value={value}>
      <div className="relative">
        {/* Dev mode banner */}
        <div className="fixed top-0 left-0 right-0 bg-yellow-500/90 text-black text-center text-xs py-1 z-[9999] font-medium">
          DEV MODE - Mock wallet: {MOCK_WALLET_ADDRESS.slice(0, 10)}...
        </div>
        <div className="pt-6">
          {children}
        </div>
      </div>
    </MockWalletContext.Provider>
  );
}

export function useMockWalletContext() {
  return useContext(MockWalletContext);
}
