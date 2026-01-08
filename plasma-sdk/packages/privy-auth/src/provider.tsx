'use client';

import { ReactNode } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import {
  PLASMA_MAINNET_CHAIN_ID,
  PLASMA_MAINNET_RPC,
  PLASMA_TESTNET_CHAIN_ID,
  PLASMA_TESTNET_RPC,
} from '@plasma-pay/core';
import type { PlasmaPrivyConfig } from './types';

// Plasma brand accent color - typed as hex string literal for Privy config
const PLASMA_BRAND_COLOR: `#${string}` = '#00D4FF';

interface PlasmaPrivyProviderProps {
  children: ReactNode;
  config: PlasmaPrivyConfig;
}

export function PlasmaPrivyProvider({ children, config }: PlasmaPrivyProviderProps) {
  const {
    appId,
    plasmaChainId = PLASMA_MAINNET_CHAIN_ID,
    loginMethods = ['email', 'google', 'apple'],
    appearance = {},
    embeddedWallets = {},
  } = config;

  const isTestnet = plasmaChainId === PLASMA_TESTNET_CHAIN_ID;
  const rpcUrl = isTestnet ? PLASMA_TESTNET_RPC : PLASMA_MAINNET_RPC;
  const chainName = isTestnet ? 'Plasma Testnet' : 'Plasma';

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: loginMethods,
        appearance: {
          theme: appearance.theme ?? 'dark',
          accentColor: appearance.accentColor ?? PLASMA_BRAND_COLOR,
          logo: appearance.logo,
        },
        embeddedWallets: {
          createOnLogin: embeddedWallets.createOnLogin ?? 'users-without-wallets',
          noPromptOnSignature: embeddedWallets.noPromptOnSignature ?? true,
        },
        defaultChain: {
          id: plasmaChainId,
          name: chainName,
          network: chainName.toLowerCase().replace(' ', '-'),
          rpcUrls: {
            default: { http: [rpcUrl] },
          },
          nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
          },
        },
        supportedChains: [
          {
            id: plasmaChainId,
            name: chainName,
            network: chainName.toLowerCase().replace(' ', '-'),
            rpcUrls: {
              default: { http: [rpcUrl] },
            },
            nativeCurrency: {
              name: 'Ether',
              symbol: 'ETH',
              decimals: 18,
            },
          },
        ],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
