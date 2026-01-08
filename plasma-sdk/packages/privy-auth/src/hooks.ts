'use client';

import { useCallback, useMemo, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import type { ConnectedWallet } from '@privy-io/react-auth';
import type { Address, Hex } from 'viem';
import { createPublicClient, http, formatUnits } from 'viem';
import {
  PLASMA_MAINNET_CHAIN_ID,
  PLASMA_MAINNET_RPC,
  USDT0_ADDRESS,
  type TypedDataParams,
} from '@plasma-pay/core';
import { plasmaMainnet } from '@plasma-pay/core';
import {
  createTransferParams,
  buildTransferAuthorizationTypedData,
} from '@plasma-pay/gasless';
import type {
  PlasmaWalletState,
  PlasmaEmbeddedWallet,
  GaslessTransferOptions,
  GaslessTransferResult,
} from './types';

const ERC20_BALANCE_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export function usePlasmaWallet(): PlasmaWalletState {
  const { user, authenticated, ready, login, logout, linkEmail, linkPhone } = usePrivy();
  const { wallets } = useWallets();

  const embeddedWallet = useMemo(() => {
    const privyWallet = wallets.find(w => w.walletClientType === 'privy');
    if (!privyWallet) return null;

    return createPlasmaEmbeddedWallet(privyWallet);
  }, [wallets]);

  return {
    user,
    authenticated,
    ready,
    wallet: embeddedWallet,
    login,
    logout,
    linkEmail,
    linkPhone,
  };
}

function createPlasmaEmbeddedWallet(connectedWallet: ConnectedWallet): PlasmaEmbeddedWallet {
  const address = connectedWallet.address as Address;

  return {
    address,
    connectedWallet,
    
    async signTypedData(data: TypedDataParams): Promise<Hex> {
      const provider = await connectedWallet.getEthereumProvider();
      
      const signature = await provider.request({
        method: 'eth_signTypedData_v4',
        params: [address, JSON.stringify({
          domain: data.domain,
          types: {
            EIP712Domain: [
              { name: 'name', type: 'string' },
              { name: 'version', type: 'string' },
              { name: 'chainId', type: 'uint256' },
              { name: 'verifyingContract', type: 'address' },
            ],
            ...data.types,
          },
          primaryType: data.primaryType,
          message: data.message,
        })],
      });
      
      return signature as Hex;
    },

    async switchChain(chainId: number): Promise<void> {
      await connectedWallet.switchChain(chainId);
    },

    async getBalance(): Promise<bigint> {
      const publicClient = createPublicClient({
        chain: plasmaMainnet,
        transport: http(PLASMA_MAINNET_RPC),
      });

      const balance = await publicClient.readContract({
        address: USDT0_ADDRESS,
        abi: ERC20_BALANCE_ABI,
        functionName: 'balanceOf',
        args: [address],
      });

      return balance;
    },
  };
}

export function useGaslessTransfer() {
  const { wallet } = usePlasmaWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signTransfer = useCallback(async (
    options: GaslessTransferOptions
  ): Promise<GaslessTransferResult> => {
    if (!wallet) {
      return { success: false, error: 'No wallet connected' };
    }

    setLoading(true);
    setError(null);

    try {
      const params = createTransferParams(
        wallet.address,
        options.to,
        options.amount,
        { validityPeriod: options.validityPeriod }
      );

      const typedData = buildTransferAuthorizationTypedData(params, {
        chainId: PLASMA_MAINNET_CHAIN_ID,
        tokenAddress: USDT0_ADDRESS,
      });

      const signature = await wallet.signTypedData(typedData);

      return {
        success: true,
        signature,
        typedData,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Signing failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  return {
    signTransfer,
    loading,
    error,
    ready: !!wallet,
  };
}

export function useUSDT0Balance() {
  const { wallet } = usePlasmaWallet();
  const [balance, setBalance] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!wallet) {
      setBalance(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const bal = await wallet.getBalance();
      setBalance(bal);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  const formatted = useMemo(() => {
    if (balance === null) return null;
    return formatUnits(balance, 6);
  }, [balance]);

  return {
    balance,
    formatted,
    loading,
    error,
    refresh,
  };
}
