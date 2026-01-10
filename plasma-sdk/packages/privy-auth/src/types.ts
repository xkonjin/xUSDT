import type { Address, Hex } from 'viem';
import type { User, ConnectedWallet } from '@privy-io/react-auth';
import type { PlasmaWallet, EIP3009TypedData } from '@plasma-pay/core';

export type PrivyLoginMethod = 'email' | 'sms' | 'google' | 'apple' | 'twitter' | 'discord' | 'github' | 'linkedin' | 'wallet';

export interface PlasmaPrivyConfig {
  appId: string;
  plasmaChainId?: number;
  loginMethods?: PrivyLoginMethod[];
  appearance?: {
    theme?: 'light' | 'dark';
    /** Hex color code for accent color (e.g., '#00D4FF') */
    accentColor?: `#${string}`;
    logo?: string;
  };
  embeddedWallets?: {
    createOnLogin?: 'users-without-wallets' | 'all-users' | 'off';
    noPromptOnSignature?: boolean;
  };
  externalWallets?: {
    /** Enable Solana wallet connectors */
    solana?: boolean;
    /** Enable Ethereum wallet connectors (MetaMask, Rabby, etc.) */
    ethereum?: boolean;
  };
  /** WalletConnect Cloud project ID for external wallet connections */
  walletConnectProjectId?: string;
}

export interface PlasmaWalletState {
  user: User | null;
  authenticated: boolean;
  ready: boolean;
  wallet: PlasmaEmbeddedWallet | null;
  login: () => void;
  logout: () => Promise<void>;
  linkEmail: () => void;
  linkPhone: () => void;
}

export interface PlasmaEmbeddedWallet extends PlasmaWallet {
  connectedWallet: ConnectedWallet;
  switchChain: (chainId: number) => Promise<void>;
  getBalance: () => Promise<bigint>;
}

export interface GaslessTransferOptions {
  to: Address;
  amount: bigint;
  validityPeriod?: number;
}

export interface GaslessTransferResult {
  success: boolean;
  signature?: Hex;
  typedData?: EIP3009TypedData;
  error?: string;
}

export interface FundWalletOptions {
  amount?: string;
  asset?: 'USDT0' | 'ETH';
  method?: 'card' | 'exchange' | 'wallet' | 'manual';
  preferredProvider?: 'moonpay' | 'coinbase';
}


