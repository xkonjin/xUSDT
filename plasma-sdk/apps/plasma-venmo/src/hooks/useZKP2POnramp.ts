'use client';

import { useState, useCallback, useEffect } from 'react';

// ZKP2P Extension State Types
type PeerExtensionState = 'needs_install' | 'needs_connection' | 'ready' | 'not_supported';

interface OnrampParams {
  referrer: string;
  referrerLogo?: string;
  callbackUrl?: string;
  inputCurrency?: string;
  inputAmount?: string;
  paymentPlatform?: 'venmo' | 'revolut' | 'wise' | 'cashapp';
  toToken?: string;
  recipientAddress: string;
  amountUsdc?: string;
}

interface UseZKP2POnrampReturn {
  state: PeerExtensionState;
  isLoading: boolean;
  error: string | null;
  isMobile: boolean;
  checkState: () => Promise<PeerExtensionState>;
  openInstallPage: () => void;
  requestConnection: () => Promise<boolean>;
  startOnramp: (params: Partial<OnrampParams>) => Promise<void>;
  onProofComplete: (callback: (proof: unknown) => void) => () => void;
}

// Chain IDs for supported networks
const CHAIN_IDS = {
  base: 8453,
  ethereum: 1,
  polygon: 137,
  arbitrum: 42161,
  solana: 792703809,
} as const;

// Token addresses
const TOKEN_ADDRESSES = {
  base: {
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    usdt: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    eth: '0x0000000000000000000000000000000000000000',
  },
  ethereum: {
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    usdt: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    eth: '0x0000000000000000000000000000000000000000',
  },
} as const;

// Default configuration for Plenmo
const PLENMO_CONFIG = {
  referrer: 'Plenmo',
  referrerLogo: 'https://plasma-venmo.vercel.app/logo.png',
  callbackUrl: typeof window !== 'undefined' ? `${window.location.origin}/onramp/success` : '',
  defaultChain: 'base' as const,
  defaultToken: 'usdc' as const,
};

// Chrome Web Store URL for Peer extension
const PEER_EXTENSION_CHROME_URL = 'https://chromewebstore.google.com/detail/peer/placeholder-id';

export function useZKP2POnramp(): UseZKP2POnrampReturn {
  const [state, setState] = useState<PeerExtensionState>('needs_install');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check if running on mobile
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const mobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      setIsMobile(mobile);
      if (mobile) {
        setState('not_supported');
      }
    }
  }, []);

  // Check if Peer extension is available
  const isPeerExtensionAvailable = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    // Check for Peer extension injected object
    return !!(window as unknown as { peerExtension?: unknown }).peerExtension;
  }, []);

  // Check extension state
  const checkState = useCallback(async (): Promise<PeerExtensionState> => {
    if (isMobile) {
      setState('not_supported');
      return 'not_supported';
    }

    if (!isPeerExtensionAvailable()) {
      setState('needs_install');
      return 'needs_install';
    }

    try {
      // Try to get state from extension
      const peerExt = (window as unknown as { peerExtension: { getState: () => Promise<string> } }).peerExtension;
      const extState = await peerExt.getState();
      
      if (extState === 'connected' || extState === 'ready') {
        setState('ready');
        return 'ready';
      } else {
        setState('needs_connection');
        return 'needs_connection';
      }
    } catch {
      setState('needs_connection');
      return 'needs_connection';
    }
  }, [isMobile, isPeerExtensionAvailable]);

  // Initialize state on mount
  useEffect(() => {
    checkState();
  }, [checkState]);

  // Open Chrome Web Store to install extension
  const openInstallPage = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.open(PEER_EXTENSION_CHROME_URL, '_blank');
    }
  }, []);

  // Request connection to extension
  const requestConnection = useCallback(async (): Promise<boolean> => {
    if (!isPeerExtensionAvailable()) {
      setError('Peer extension not installed');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const peerExt = (window as unknown as { peerExtension: { requestConnection: () => Promise<boolean> } }).peerExtension;
      const approved = await peerExt.requestConnection();
      
      if (approved) {
        setState('ready');
      }
      
      return approved;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Peer extension');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isPeerExtensionAvailable]);

  // Start onramp flow
  const startOnramp = useCallback(async (params: Partial<OnrampParams>): Promise<void> => {
    const currentState = await checkState();

    if (currentState === 'not_supported') {
      setError('ZKP2P onramp is only available on desktop browsers');
      return;
    }

    if (currentState === 'needs_install') {
      openInstallPage();
      setError('Please install the Peer extension to continue');
      return;
    }

    if (currentState === 'needs_connection') {
      const connected = await requestConnection();
      if (!connected) {
        setError('Please approve the connection to continue');
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      // Build token string
      const chain = PLENMO_CONFIG.defaultChain;
      const token = PLENMO_CONFIG.defaultToken;
      const chainId = CHAIN_IDS[chain];
      const tokenAddress = TOKEN_ADDRESSES[chain][token];
      const toToken = params.toToken || `${chainId}:${tokenAddress}`;

      // Build onramp parameters
      const onrampParams: OnrampParams = {
        referrer: PLENMO_CONFIG.referrer,
        referrerLogo: PLENMO_CONFIG.referrerLogo,
        callbackUrl: params.callbackUrl || PLENMO_CONFIG.callbackUrl,
        inputCurrency: params.inputCurrency || 'USD',
        inputAmount: params.inputAmount,
        paymentPlatform: params.paymentPlatform,
        toToken,
        recipientAddress: params.recipientAddress || '',
        amountUsdc: params.amountUsdc,
      };

      // Call extension onramp method
      const peerExt = (window as unknown as { peerExtension: { onramp: (p: OnrampParams) => void } }).peerExtension;
      peerExt.onramp(onrampParams);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start onramp');
    } finally {
      setIsLoading(false);
    }
  }, [checkState, openInstallPage, requestConnection]);

  // Subscribe to proof completion events
  const onProofComplete = useCallback((callback: (proof: unknown) => void): (() => void) => {
    if (!isPeerExtensionAvailable()) {
      return () => {};
    }

    try {
      const peerExt = (window as unknown as { peerExtension: { onProofComplete: (cb: (p: unknown) => void) => () => void } }).peerExtension;
      return peerExt.onProofComplete(callback);
    } catch {
      return () => {};
    }
  }, [isPeerExtensionAvailable]);

  return {
    state,
    isLoading,
    error,
    isMobile,
    checkState,
    openInstallPage,
    requestConnection,
    startOnramp,
    onProofComplete,
  };
}

export default useZKP2POnramp;
