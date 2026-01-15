'use client';

import { ReactNode } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { defineChain } from 'viem';
import {
  PLASMA_MAINNET_CHAIN_ID,
  PLASMA_MAINNET_RPC,
  PLASMA_TESTNET_CHAIN_ID,
  PLASMA_TESTNET_RPC,
  PLASMA_EXPLORER_URL,
} from '@plasma-pay/core';
import type { PlasmaPrivyConfig } from './types';

// Plasma brand accent color - typed as hex string literal for Privy config
const PLASMA_BRAND_COLOR: `#${string}` = '#00D4FF';

// Define Plasma Mainnet chain using viem's defineChain
const plasmaMainnet = defineChain({
  id: PLASMA_MAINNET_CHAIN_ID,
  name: 'Plasma',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [PLASMA_MAINNET_RPC] },
  },
  blockExplorers: {
    default: { name: 'Plasma Explorer', url: PLASMA_EXPLORER_URL },
  },
});

// Define Plasma Testnet chain using viem's defineChain
const plasmaTestnet = defineChain({
  id: PLASMA_TESTNET_CHAIN_ID,
  name: 'Plasma Testnet',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [PLASMA_TESTNET_RPC] },
  },
  blockExplorers: {
    default: { name: 'Plasma Explorer', url: PLASMA_EXPLORER_URL },
  },
  testnet: true,
});

interface PlasmaPrivyProviderProps {
  children: ReactNode;
  config: PlasmaPrivyConfig;
}

export function PlasmaPrivyProvider({ children, config }: PlasmaPrivyProviderProps) {
  const {
    appId,
    plasmaChainId = PLASMA_MAINNET_CHAIN_ID,
    loginMethods = ['email', 'google', 'apple', 'wallet'],
    appearance = {},
    embeddedWallets = {},
  } = config;

  const isTestnet = plasmaChainId === PLASMA_TESTNET_CHAIN_ID;
  const chain = isTestnet ? plasmaTestnet : plasmaMainnet;

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: loginMethods,
        appearance: {
          theme: appearance.theme ?? 'dark',
          accentColor: appearance.accentColor ?? PLASMA_BRAND_COLOR,
          logo: appearance.logo,
          walletList: [
            'metamask',
            'rabby_wallet', 
            'coinbase_wallet',
            'wallet_connect',
            'phantom',
            'rainbow',
            'detected_wallets',
          ],
        },
        embeddedWallets: {
          createOnLogin: embeddedWallets.createOnLogin ?? 'users-without-wallets',
          noPromptOnSignature: embeddedWallets.noPromptOnSignature ?? true,
        },
        defaultChain: chain,
        supportedChains: [chain],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
