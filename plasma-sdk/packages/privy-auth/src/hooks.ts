/**
 * Plasma Privy Auth Hooks
 *
 * Custom React hooks for wallet interaction with Plasma chain.
 * These hooks wrap Privy's authentication with Plasma-specific functionality
 * like gasless transfers and USDT0 balance queries.
 *
 * IMPORTANT: These hooks MUST be used within the PrivyProvider component.
 * The "use client" directive ensures they only run on the client side.
 */

"use client";

import { useCallback, useMemo, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import type { Address, Hex } from "viem";
import { createPublicClient, http, formatUnits } from "viem";
import {
  PLASMA_MAINNET_CHAIN_ID,
  PLASMA_MAINNET_RPC,
  USDT0_ADDRESS,
  type TypedDataParams,
} from "@plasma-pay/core";
import { plasmaMainnet } from "@plasma-pay/core";
import {
  createTransferParams,
  buildTransferAuthorizationTypedData,
} from "@plasma-pay/gasless";
import type {
  PlasmaWalletState,
  PlasmaEmbeddedWallet,
  GaslessTransferOptions,
  GaslessTransferResult,
} from "./types";

// =============================================================================
// Constants
// =============================================================================

// ERC20 balance ABI for USDT0 balance queries
const ERC20_BALANCE_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * usePlasmaWallet Hook
 *
 * Main hook for accessing the Plasma embedded wallet and authentication state.
 * Provides login/logout functions and wallet instance for signing transactions.
 *
 * IMPORTANT: This hook must be used within a PrivyProvider component.
 *
 * Usage:
 * ```tsx
 * const { authenticated, wallet, login, logout } = usePlasmaWallet();
 *
 * if (!authenticated) {
 *   return <button onClick={login}>Connect Wallet</button>;
 * }
 *
 * // Use wallet for signing
 * const signature = await wallet.signTypedData(typedData);
 * ```
 *
 * @returns PlasmaWalletState with authentication and wallet info
 */
export function usePlasmaWallet(): PlasmaWalletState {
  // Use Privy hooks directly - the "use client" directive ensures this only runs client-side
  const { user, authenticated, ready, login, logout, linkEmail, linkPhone } =
    usePrivy();
  const { wallets } = useWallets();

  // Extract embedded wallet from Privy wallets array
  // Memoized to prevent recreating the wallet object on every render
  const embeddedWallet = useMemo(() => {
    if (!wallets || wallets.length === 0) return null;

    // Find the Privy embedded wallet (walletClientType === "privy")
    const privyWallet = wallets.find(
      (w) => w.walletClientType === "privy"
    );
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

// =============================================================================
// Internal Helper Functions
// =============================================================================

/**
 * Create a PlasmaEmbeddedWallet instance from a Privy ConnectedWallet
 *
 * Wraps the Privy wallet with Plasma-specific methods for:
 * - Signing EIP-712 typed data (for gasless transfers)
 * - Switching chains
 * - Querying USDT0 balance
 *
 * @param connectedWallet - A Privy ConnectedWallet instance from useWallets()
 */
function createPlasmaEmbeddedWallet(
  connectedWallet: ReturnType<typeof useWallets>["wallets"][number]
): PlasmaEmbeddedWallet {
  const address = connectedWallet.address as Address;

  return {
    address,
    connectedWallet,

    /**
     * Sign EIP-712 typed data for gasless transfers
     * Uses eth_signTypedData_v4 RPC method
     */
    async signTypedData(data: TypedDataParams): Promise<Hex> {
      const provider = await connectedWallet.getEthereumProvider();

      const signature = await provider.request({
        method: "eth_signTypedData_v4",
        params: [
          address,
          JSON.stringify({
            domain: data.domain,
            types: {
              EIP712Domain: [
                { name: "name", type: "string" },
                { name: "version", type: "string" },
                { name: "chainId", type: "uint256" },
                { name: "verifyingContract", type: "address" },
              ],
              ...data.types,
            },
            primaryType: data.primaryType,
            message: data.message,
          }),
        ],
      });

      return signature as Hex;
    },

    /**
     * Switch to a different chain
     */
    async switchChain(chainId: number): Promise<void> {
      await connectedWallet.switchChain(chainId);
    },

    /**
     * Get USDT0 balance on Plasma mainnet
     */
    async getBalance(): Promise<bigint> {
      const publicClient = createPublicClient({
        chain: plasmaMainnet,
        transport: http(PLASMA_MAINNET_RPC),
      });

      const balance = await publicClient.readContract({
        address: USDT0_ADDRESS,
        abi: ERC20_BALANCE_ABI,
        functionName: "balanceOf",
        args: [address],
      });

      return balance;
    },
  };
}

/**
 * useGaslessTransfer Hook
 *
 * Hook for creating signed gasless transfer authorizations.
 * Returns a function to sign EIP-3009 transferWithAuthorization data.
 *
 * Usage:
 * ```tsx
 * const { signTransfer, loading, error, ready } = useGaslessTransfer();
 *
 * const result = await signTransfer({
 *   to: recipientAddress,
 *   amount: parseUnits('10', 6), // 10 USDT0
 * });
 *
 * if (result.success) {
 *   // Submit result.signature to your backend for relay
 * }
 * ```
 */
export function useGaslessTransfer() {
  const { wallet } = usePlasmaWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signTransfer = useCallback(
    async (options: GaslessTransferOptions): Promise<GaslessTransferResult> => {
      if (!wallet) {
        return { success: false, error: "No wallet connected" };
      }

      setLoading(true);
      setError(null);

      try {
        // Create transfer parameters with nonce and validity window
        const params = createTransferParams(
          wallet.address,
          options.to,
          options.amount,
          { validityPeriod: options.validityPeriod }
        );

        // Build EIP-712 typed data for signing
        const typedData = buildTransferAuthorizationTypedData(params, {
          chainId: PLASMA_MAINNET_CHAIN_ID,
          tokenAddress: USDT0_ADDRESS,
        });

        // Request user signature via wallet popup
        const signature = await wallet.signTypedData(typedData);

        return {
          success: true,
          signature,
          typedData,
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Signing failed";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [wallet]
  );

  return {
    signTransfer,
    loading,
    error,
    ready: !!wallet,
  };
}

/**
 * useUSDT0Balance Hook
 *
 * Hook for querying and displaying USDT0 balance.
 * Provides formatted balance string and refresh function.
 *
 * Usage:
 * ```tsx
 * const { formatted, refresh, loading } = useUSDT0Balance();
 *
 * useEffect(() => {
 *   refresh();
 * }, []);
 *
 * return <div>Balance: ${formatted} USDT0</div>;
 * ```
 */
export function useUSDT0Balance() {
  const { wallet } = usePlasmaWallet();
  const [balance, setBalance] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refresh balance when wallet changes
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
      setError(err instanceof Error ? err.message : "Failed to fetch balance");
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  // Format balance for display (6 decimals for USDT0)
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
