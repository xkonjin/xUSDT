/**
 * Relayer Wallet Management
 *
 * Provides utilities for:
 * - Checking relayer wallet balances (ETH/XPL + USDT0)
 * - Low balance alerts/webhooks
 * - Wallet rotation support
 *
 * @module relayer-wallet
 */

import { createPublicClient, http, formatEther, formatUnits, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { USDT0_ADDRESS, USDT0_DECIMALS, PLASMA_MAINNET_RPC } from '@plasma-pay/core';
import { plasmaMainnet } from '@plasma-pay/core';
import { validatePrivateKey } from './validation';

// =============================================================================
// Types
// =============================================================================

export interface RelayerWalletConfig {
  /** Private key for the relayer wallet */
  privateKey: Hex;
  /** Label/name for this wallet (for logging) */
  label?: string;
}

export interface RelayerWalletStatus {
  /** Wallet address */
  address: Address;
  /** Wallet label */
  label: string;
  /** Native token balance (XPL) in wei */
  nativeBalanceWei: string;
  /** Native token balance formatted */
  nativeBalance: string;
  /** USDT0 balance in atomic units */
  usdt0BalanceAtomic: string;
  /** USDT0 balance formatted */
  usdt0Balance: string;
  /** Whether native balance is below threshold */
  lowNativeBalance: boolean;
  /** Whether USDT0 balance is below threshold */
  lowUsdt0Balance: boolean;
  /** Estimated transactions remaining based on gas */
  estimatedTxRemaining: number;
  /** Timestamp of status check */
  timestamp: number;
}

export interface AlertConfig {
  /** Webhook URL for alerts */
  webhookUrl?: string;
  /** Minimum native balance threshold (in ETH/XPL) */
  minNativeBalance?: number;
  /** Minimum USDT0 balance threshold */
  minUsdt0Balance?: number;
  /** Whether to send alerts (respects quiet hours) */
  enabled?: boolean;
}

export interface WalletRotationConfig {
  /** List of wallet configs to rotate through */
  wallets: RelayerWalletConfig[];
  /** Strategy for rotation */
  strategy: 'round-robin' | 'lowest-nonce' | 'highest-balance';
}

// =============================================================================
// Constants
// =============================================================================

/** Default gas estimate per transfer transaction */
const ESTIMATED_GAS_PER_TX = 80000n;

/** Default gas price in gwei */
const DEFAULT_GAS_PRICE_GWEI = 1n;

/** Minimum native balance threshold (0.01 XPL) */
const DEFAULT_MIN_NATIVE_BALANCE = 0.01;

/** Minimum USDT0 balance threshold ($10) */
const DEFAULT_MIN_USDT0_BALANCE = 10;

// ERC20 ABI for balance check
const ERC20_BALANCE_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Get the public client for Plasma mainnet
 */
function getPublicClient() {
  return createPublicClient({
    chain: plasmaMainnet,
    transport: http(PLASMA_MAINNET_RPC),
  });
}

/**
 * Get the relayer wallet address from environment
 */
export function getRelayerAddress(): Address | null {
  const envKey = process.env.RELAYER_PRIVATE_KEY;
  if (!envKey) return null;

  const result = validatePrivateKey(envKey);
  if (!result.valid) return null;

  try {
    const account = privateKeyToAccount(result.key as Hex);
    return account.address;
  } catch {
    return null;
  }
}

/**
 * Get the status of the relayer wallet
 */
export async function getRelayerWalletStatus(
  config?: Partial<AlertConfig>
): Promise<RelayerWalletStatus | null> {
  const minNativeBalance = config?.minNativeBalance ?? DEFAULT_MIN_NATIVE_BALANCE;
  const minUsdt0Balance = config?.minUsdt0Balance ?? DEFAULT_MIN_USDT0_BALANCE;

  const envKey = process.env.RELAYER_PRIVATE_KEY;
  if (!envKey) {
    console.error('[relayer-wallet] RELAYER_PRIVATE_KEY not configured');
    return null;
  }

  const result = validatePrivateKey(envKey);
  if (!result.valid) {
    console.error('[relayer-wallet] Invalid RELAYER_PRIVATE_KEY:', result.error);
    return null;
  }

  try {
    const account = privateKeyToAccount(result.key as Hex);
    const address = account.address;
    const publicClient = getPublicClient();

    // Fetch balances in parallel
    const [nativeBalanceWei, usdt0BalanceAtomic] = await Promise.all([
      publicClient.getBalance({ address }),
      publicClient.readContract({
        address: USDT0_ADDRESS,
        abi: ERC20_BALANCE_ABI,
        functionName: 'balanceOf',
        args: [address],
      }),
    ]);

    // Format balances
    const nativeBalance = formatEther(nativeBalanceWei);
    const usdt0Balance = formatUnits(usdt0BalanceAtomic, USDT0_DECIMALS);

    // Check thresholds
    const lowNativeBalance = parseFloat(nativeBalance) < minNativeBalance;
    const lowUsdt0Balance = parseFloat(usdt0Balance) < minUsdt0Balance;

    // Estimate transactions remaining based on gas
    const gasCostPerTx = ESTIMATED_GAS_PER_TX * (DEFAULT_GAS_PRICE_GWEI * 10n ** 9n);
    const estimatedTxRemaining = nativeBalanceWei > 0n
      ? Number(nativeBalanceWei / gasCostPerTx)
      : 0;

    return {
      address,
      label: process.env.RELAYER_WALLET_LABEL || 'primary',
      nativeBalanceWei: nativeBalanceWei.toString(),
      nativeBalance,
      usdt0BalanceAtomic: usdt0BalanceAtomic.toString(),
      usdt0Balance,
      lowNativeBalance,
      lowUsdt0Balance,
      estimatedTxRemaining,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('[relayer-wallet] Failed to get wallet status:', error);
    return null;
  }
}

/**
 * Get status of multiple relayer wallets (for rotation)
 */
export async function getMultiWalletStatus(
  wallets: RelayerWalletConfig[],
  config?: Partial<AlertConfig>
): Promise<RelayerWalletStatus[]> {
  const minNativeBalance = config?.minNativeBalance ?? DEFAULT_MIN_NATIVE_BALANCE;
  const minUsdt0Balance = config?.minUsdt0Balance ?? DEFAULT_MIN_USDT0_BALANCE;
  const publicClient = getPublicClient();

  const results: RelayerWalletStatus[] = [];

  for (const wallet of wallets) {
    try {
      const result = validatePrivateKey(wallet.privateKey);
      if (!result.valid) {
        console.warn(`[relayer-wallet] Skipping invalid wallet ${wallet.label}:`, result.error);
        continue;
      }

      const account = privateKeyToAccount(result.key as Hex);
      const address = account.address;

      const [nativeBalanceWei, usdt0BalanceAtomic] = await Promise.all([
        publicClient.getBalance({ address }),
        publicClient.readContract({
          address: USDT0_ADDRESS,
          abi: ERC20_BALANCE_ABI,
          functionName: 'balanceOf',
          args: [address],
        }),
      ]);

      const nativeBalance = formatEther(nativeBalanceWei);
      const usdt0Balance = formatUnits(usdt0BalanceAtomic, USDT0_DECIMALS);
      const lowNativeBalance = parseFloat(nativeBalance) < minNativeBalance;
      const lowUsdt0Balance = parseFloat(usdt0Balance) < minUsdt0Balance;
      const gasCostPerTx = ESTIMATED_GAS_PER_TX * (DEFAULT_GAS_PRICE_GWEI * 10n ** 9n);
      const estimatedTxRemaining = nativeBalanceWei > 0n
        ? Number(nativeBalanceWei / gasCostPerTx)
        : 0;

      results.push({
        address,
        label: wallet.label || 'unnamed',
        nativeBalanceWei: nativeBalanceWei.toString(),
        nativeBalance,
        usdt0BalanceAtomic: usdt0BalanceAtomic.toString(),
        usdt0Balance,
        lowNativeBalance,
        lowUsdt0Balance,
        estimatedTxRemaining,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error(`[relayer-wallet] Failed to get status for wallet ${wallet.label}:`, error);
    }
  }

  return results;
}

// =============================================================================
// Alert Functions
// =============================================================================

export interface AlertPayload {
  type: 'low_native_balance' | 'low_usdt0_balance' | 'critical_balance';
  walletAddress: Address;
  walletLabel: string;
  nativeBalance: string;
  usdt0Balance: string;
  estimatedTxRemaining: number;
  timestamp: number;
  message: string;
}

/**
 * Send a low balance alert via webhook
 */
export async function sendLowBalanceAlert(
  status: RelayerWalletStatus,
  webhookUrl: string
): Promise<boolean> {
  const alerts: AlertPayload[] = [];

  // Determine alert type(s)
  if (status.lowNativeBalance && status.lowUsdt0Balance) {
    alerts.push({
      type: 'critical_balance',
      walletAddress: status.address,
      walletLabel: status.label,
      nativeBalance: status.nativeBalance,
      usdt0Balance: status.usdt0Balance,
      estimatedTxRemaining: status.estimatedTxRemaining,
      timestamp: status.timestamp,
      message: `🚨 CRITICAL: Relayer wallet "${status.label}" has low XPL (${status.nativeBalance}) AND low USDT0 ($${status.usdt0Balance}). Only ~${status.estimatedTxRemaining} transactions remaining!`,
    });
  } else if (status.lowNativeBalance) {
    alerts.push({
      type: 'low_native_balance',
      walletAddress: status.address,
      walletLabel: status.label,
      nativeBalance: status.nativeBalance,
      usdt0Balance: status.usdt0Balance,
      estimatedTxRemaining: status.estimatedTxRemaining,
      timestamp: status.timestamp,
      message: `⚠️ Relayer wallet "${status.label}" has low XPL balance: ${status.nativeBalance} XPL. ~${status.estimatedTxRemaining} transactions remaining.`,
    });
  } else if (status.lowUsdt0Balance) {
    alerts.push({
      type: 'low_usdt0_balance',
      walletAddress: status.address,
      walletLabel: status.label,
      nativeBalance: status.nativeBalance,
      usdt0Balance: status.usdt0Balance,
      estimatedTxRemaining: status.estimatedTxRemaining,
      timestamp: status.timestamp,
      message: `⚠️ Relayer wallet "${status.label}" has low USDT0 balance: $${status.usdt0Balance}.`,
    });
  }

  if (alerts.length === 0) {
    return true; // No alerts needed
  }

  try {
    for (const alert of alerts) {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert),
      });

      if (!response.ok) {
        console.error(`[relayer-wallet] Webhook failed: ${response.status} ${response.statusText}`);
        return false;
      }
    }

    console.log(`[relayer-wallet] Sent ${alerts.length} alert(s) to webhook`);
    return true;
  } catch (error) {
    console.error('[relayer-wallet] Failed to send webhook alert:', error);
    return false;
  }
}

/**
 * Check wallet status and send alerts if needed
 */
export async function checkAndAlert(config?: AlertConfig): Promise<{
  status: RelayerWalletStatus | null;
  alertsSent: boolean;
}> {
  const status = await getRelayerWalletStatus(config);

  if (!status) {
    return { status: null, alertsSent: false };
  }

  let alertsSent = false;

  // Send webhook alerts if configured and thresholds exceeded
  if (config?.webhookUrl && config?.enabled !== false) {
    if (status.lowNativeBalance || status.lowUsdt0Balance) {
      alertsSent = await sendLowBalanceAlert(status, config.webhookUrl);
    }
  }

  return { status, alertsSent };
}

// =============================================================================
// Wallet Rotation
// =============================================================================

/** In-memory rotation index */
let rotationIndex = 0;

/**
 * Select the next wallet based on rotation strategy
 */
export async function selectWallet(
  config: WalletRotationConfig
): Promise<RelayerWalletConfig | null> {
  if (config.wallets.length === 0) {
    return null;
  }

  if (config.wallets.length === 1) {
    return config.wallets[0];
  }

  switch (config.strategy) {
    case 'round-robin': {
      const wallet = config.wallets[rotationIndex % config.wallets.length];
      rotationIndex++;
      return wallet;
    }

    case 'highest-balance': {
      const statuses = await getMultiWalletStatus(config.wallets);
      if (statuses.length === 0) return config.wallets[0];

      // Sort by native balance (descending) to pick wallet with most gas
      statuses.sort((a, b) => {
        const aBalance = BigInt(a.nativeBalanceWei);
        const bBalance = BigInt(b.nativeBalanceWei);
        return bBalance > aBalance ? 1 : bBalance < aBalance ? -1 : 0;
      });

      const selectedAddress = statuses[0].address;
      return config.wallets.find(w => {
        const result = validatePrivateKey(w.privateKey);
        if (!result.valid) return false;
        const account = privateKeyToAccount(result.key as Hex);
        return account.address.toLowerCase() === selectedAddress.toLowerCase();
      }) || config.wallets[0];
    }

    case 'lowest-nonce': {
      // For lowest-nonce, we'd need to fetch nonces - fallback to round-robin for now
      const wallet = config.wallets[rotationIndex % config.wallets.length];
      rotationIndex++;
      return wallet;
    }

    default:
      return config.wallets[0];
  }
}

/**
 * Parse rotation config from environment variables
 *
 * Environment format:
 * RELAYER_WALLETS=label1:0xprivkey1,label2:0xprivkey2
 * RELAYER_ROTATION_STRATEGY=round-robin|highest-balance|lowest-nonce
 */
export function parseRotationConfigFromEnv(): WalletRotationConfig | null {
  const walletsEnv = process.env.RELAYER_WALLETS;
  const strategy = (process.env.RELAYER_ROTATION_STRATEGY || 'round-robin') as WalletRotationConfig['strategy'];

  if (!walletsEnv) {
    // Fall back to single wallet
    const singleKey = process.env.RELAYER_PRIVATE_KEY;
    if (!singleKey) return null;

    return {
      wallets: [{
        privateKey: singleKey as Hex,
        label: process.env.RELAYER_WALLET_LABEL || 'primary',
      }],
      strategy: 'round-robin',
    };
  }

  const wallets: RelayerWalletConfig[] = [];

  for (const entry of walletsEnv.split(',')) {
    const [label, key] = entry.split(':');
    if (key) {
      const validated = validatePrivateKey(key);
      if (validated.valid) {
        wallets.push({
          privateKey: validated.key as Hex,
          label: label || `wallet-${wallets.length + 1}`,
        });
      } else {
        console.warn(`[relayer-wallet] Skipping invalid wallet "${label}": ${validated.error}`);
      }
    }
  }

  if (wallets.length === 0) {
    return null;
  }

  return { wallets, strategy };
}
