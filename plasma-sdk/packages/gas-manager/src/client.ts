/**
 * @plasma-pay/gas-manager - Gas Manager Client
 * 
 * Auto gas management for self-sovereign agent operation on Plasma
 * Ensures agents always have XPL for transactions without relying on a relayer
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  formatUnits,
  parseUnits,
  type PublicClient,
  type WalletClient,
  type Address,
  type Hex,
  privateKeyToAccount,
  type Account,
} from 'viem';
import type {
  GasManagerConfig,
  GasBalance,
  RefillResult,
  GasManagerEvent,
  GasManagerEventHandler,
} from './types';
import {
  PLASMA_CHAIN_ID,
  PLASMA_RPC_URL,
  DEFAULT_MIN_BALANCE,
  DEFAULT_TARGET_BALANCE,
  DEFAULT_REFILL_AMOUNT,
  ESTIMATED_TX_GAS,
  ESTIMATED_ERC20_GAS,
  ESTIMATED_GAS_PRICE,
  USDT0_ADDRESS,
  GAS_SWAP_ROUTER,
} from './types';

// Plasma chain definition
const plasma = {
  id: PLASMA_CHAIN_ID,
  name: 'Plasma',
  nativeCurrency: { decimals: 18, name: 'XPL', symbol: 'XPL' },
  rpcUrls: { default: { http: [PLASMA_RPC_URL] } },
};

// ERC20 ABI for USDT0 balance and approval
const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Simple swap router ABI
const SWAP_ROUTER_ABI = [
  {
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactTokensForETH',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

/**
 * PlasmaGasManager - Auto gas management for self-sovereign agents
 * 
 * Monitors XPL balance and automatically refills from USDT0 when low
 * 
 * @example
 * ```typescript
 * const gasManager = new PlasmaGasManager({
 *   privateKey: process.env.WALLET_KEY,
 *   autoRefill: true,
 * });
 * 
 * // Start monitoring
 * gasManager.startMonitoring();
 * 
 * // Check balance
 * const balance = await gasManager.getBalance();
 * console.log(`XPL: ${balance.balanceFormatted}, Healthy: ${balance.isHealthy}`);
 * 
 * // Manual refill if needed
 * if (!balance.isHealthy) {
 *   await gasManager.refill();
 * }
 * ```
 */
export class PlasmaGasManager {
  private config: Required<GasManagerConfig>;
  private publicClient: PublicClient;
  private walletClient: WalletClient | null = null;
  private account: Account | null = null;
  private eventHandlers: GasManagerEventHandler[] = [];
  private monitorInterval: NodeJS.Timeout | null = null;
  private isRefilling = false;

  constructor(config: GasManagerConfig & { privateKey?: Hex } = {}) {
    // Merge with defaults
    this.config = {
      plasmaRpcUrl: config.plasmaRpcUrl || PLASMA_RPC_URL,
      minBalance: config.minBalance || DEFAULT_MIN_BALANCE,
      targetBalance: config.targetBalance || DEFAULT_TARGET_BALANCE,
      refillAmount: config.refillAmount || DEFAULT_REFILL_AMOUNT,
      autoRefill: config.autoRefill ?? true,
      checkInterval: config.checkInterval || 60_000,
      debug: config.debug || false,
    };

    // Initialize public client
    this.publicClient = createPublicClient({
      chain: plasma as any,
      transport: http(this.config.plasmaRpcUrl),
    });

    // Initialize wallet if private key provided
    if (config.privateKey) {
      this.account = privateKeyToAccount(config.privateKey);
      this.walletClient = createWalletClient({
        account: this.account,
        chain: plasma as any,
        transport: http(this.config.plasmaRpcUrl),
      });
    }

    this.log('PlasmaGasManager initialized');
  }

  /**
   * Get the wallet address
   */
  get address(): Address | null {
    return this.account?.address || null;
  }

  /**
   * Get current XPL gas balance
   */
  async getBalance(): Promise<GasBalance> {
    if (!this.address) {
      throw new Error('Wallet not configured');
    }

    const balance = await this.publicClient.getBalance({
      address: this.address,
    });

    const isHealthy = balance >= this.config.minBalance;
    const isCritical = balance < this.config.minBalance / BigInt(10);
    
    // Estimate how many transactions can be done
    const txCost = ESTIMATED_ERC20_GAS * ESTIMATED_GAS_PRICE;
    const estimatedTxCount = Number(balance / txCost);

    const result: GasBalance = {
      balance,
      balanceFormatted: formatUnits(balance, 18),
      isHealthy,
      isCritical,
      estimatedTxCount,
    };

    this.emit({ type: 'balance_checked', data: result });
    
    if (isCritical) {
      this.emit({ type: 'balance_critical', data: result });
    } else if (!isHealthy) {
      this.emit({ type: 'balance_low', data: result });
    }

    return result;
  }

  /**
   * Get USDT0 balance available for gas refill
   */
  async getUSDT0Balance(): Promise<bigint> {
    if (!this.address) {
      throw new Error('Wallet not configured');
    }

    try {
      const balance = await this.publicClient.readContract({
        address: USDT0_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [this.address],
      });
      return balance as bigint;
    } catch (error) {
      this.log('Failed to get USDT0 balance', { error });
      return BigInt(0);
    }
  }

  /**
   * Refill XPL gas by swapping USDT0
   */
  async refill(amount?: bigint): Promise<RefillResult> {
    if (!this.walletClient || !this.account) {
      return { success: false, error: 'Wallet not configured' };
    }

    if (this.isRefilling) {
      return { success: false, error: 'Refill already in progress' };
    }

    this.isRefilling = true;
    const refillAmount = amount || this.config.refillAmount;

    try {
      this.emit({ type: 'refill_started', amount: refillAmount });
      this.log('Starting gas refill', { amount: refillAmount.toString() });

      // Check USDT0 balance
      const usdt0Balance = await this.getUSDT0Balance();
      if (usdt0Balance < refillAmount) {
        throw new Error(`Insufficient USDT0 balance. Need ${formatUnits(refillAmount, 6)}, have ${formatUnits(usdt0Balance, 6)}`);
      }

      // Check and set approval if needed
      const allowance = await this.publicClient.readContract({
        address: USDT0_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [this.address!, GAS_SWAP_ROUTER],
      }) as bigint;

      if (allowance < refillAmount) {
        this.log('Approving USDT0 for swap router');
        const approveHash = await this.walletClient.writeContract({
          address: USDT0_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [GAS_SWAP_ROUTER, refillAmount * BigInt(10)], // Approve 10x for future
        });
        await this.publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      // Get balance before swap
      const balanceBefore = await this.publicClient.getBalance({
        address: this.address!,
      });

      // Execute swap
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 300); // 5 minutes
      const txHash = await this.walletClient.writeContract({
        address: GAS_SWAP_ROUTER,
        abi: SWAP_ROUTER_ABI,
        functionName: 'swapExactTokensForETH',
        args: [
          USDT0_ADDRESS,
          refillAmount,
          BigInt(0), // Accept any amount out (slippage handled by DEX)
          this.address!,
          deadline,
        ],
      });

      // Wait for confirmation
      await this.publicClient.waitForTransactionReceipt({ hash: txHash });

      // Get balance after swap
      const balanceAfter = await this.publicClient.getBalance({
        address: this.address!,
      });

      const amountReceived = balanceAfter - balanceBefore;

      const result: RefillResult = {
        success: true,
        txHash,
        amountReceived,
        amountSpent: refillAmount,
      };

      this.emit({ type: 'refill_completed', data: result });
      this.log('Gas refill completed', { 
        txHash, 
        received: formatUnits(amountReceived, 18) 
      });

      return result;
    } catch (error: any) {
      const errorMsg = error.message || 'Unknown error';
      this.emit({ type: 'refill_failed', error: errorMsg });
      this.log('Gas refill failed', { error: errorMsg });
      return { success: false, error: errorMsg };
    } finally {
      this.isRefilling = false;
    }
  }

  /**
   * Start automatic balance monitoring
   */
  startMonitoring(): void {
    if (this.monitorInterval) {
      this.log('Monitoring already started');
      return;
    }

    this.log('Starting gas balance monitoring');
    
    // Check immediately
    this.checkAndRefill();

    // Set up interval
    this.monitorInterval = setInterval(() => {
      this.checkAndRefill();
    }, this.config.checkInterval);
  }

  /**
   * Stop automatic balance monitoring
   */
  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      this.log('Stopped gas balance monitoring');
    }
  }

  /**
   * Subscribe to gas manager events
   */
  on(handler: GasManagerEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      const index = this.eventHandlers.indexOf(handler);
      if (index > -1) {
        this.eventHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Check if balance is healthy (above minimum)
   */
  async isHealthy(): Promise<boolean> {
    const balance = await this.getBalance();
    return balance.isHealthy;
  }

  /**
   * Estimate gas cost for a transaction
   */
  estimateGasCost(gasLimit: bigint = ESTIMATED_ERC20_GAS): {
    wei: bigint;
    xpl: string;
    usd: string;
  } {
    const cost = gasLimit * ESTIMATED_GAS_PRICE;
    return {
      wei: cost,
      xpl: formatUnits(cost, 18),
      usd: '< $0.0001', // Plasma gas is extremely cheap
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async checkAndRefill(): Promise<void> {
    try {
      const balance = await this.getBalance();
      
      if (!balance.isHealthy && this.config.autoRefill) {
        this.log('Balance low, triggering auto-refill');
        await this.refill();
      }
    } catch (error: any) {
      this.log('Balance check failed', { error: error.message });
    }
  }

  private emit(event: GasManagerEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (e) {
        this.log('Event handler error', { error: e });
      }
    }
  }

  private log(message: string, data?: Record<string, unknown>): void {
    if (this.config.debug) {
      console.log(`[PlasmaGasManager] ${message}`, data || '');
    }
  }
}

/**
 * Quick check if an address has enough gas for transactions
 */
export async function hasEnoughGas(
  address: Address,
  minBalance: bigint = DEFAULT_MIN_BALANCE,
  rpcUrl: string = PLASMA_RPC_URL
): Promise<boolean> {
  const client = createPublicClient({
    chain: plasma as any,
    transport: http(rpcUrl),
  });

  const balance = await client.getBalance({ address });
  return balance >= minBalance;
}
