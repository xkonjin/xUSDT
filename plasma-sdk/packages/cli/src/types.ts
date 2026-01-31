/**
 * Plasma Pay CLI Types
 */

export interface WalletConfig {
  address: string;
  encryptedPrivateKey?: string;
  keyringService?: string;
  createdAt: string;
  lastUsed?: string;
  name?: string;
}

export interface CLIConfig {
  wallets: WalletConfig[];
  activeWallet?: string;
  defaultNetwork: 'plasma' | 'base' | 'ethereum';
  facilitatorUrl: string;
  autoGas: boolean;
  preferPlasma: boolean;
}

export interface OnboardingOptions {
  name?: string;
  importKey?: boolean;
  generateNew?: boolean;
  useKeyring?: boolean;
}

export interface FundingOptions {
  amount: string;
  method: 'zkp2p' | 'lifi' | 'direct';
  sourceChain?: number;
  sourceToken?: string;
  platform?: 'venmo' | 'zelle' | 'revolut' | 'wise' | 'cashapp' | 'paypal';
}

export interface SendOptions {
  to: string;
  amount: string;
  currency?: string;
  targetChain?: number;
  note?: string;
}

export interface X402SetupOptions {
  endpoint: string;
  price: string;
  description?: string;
  outputFormat: 'middleware' | 'config' | 'both';
}

export interface DeFiAction {
  type: 'swap' | 'yield' | 'stake' | 'bridge';
  protocol?: string;
  amount?: string;
  fromToken?: string;
  toToken?: string;
}

export interface AgentSetupGuide {
  steps: SetupStep[];
  config: Record<string, unknown>;
  code: string;
}

export interface SetupStep {
  title: string;
  description: string;
  command?: string;
  code?: string;
}
