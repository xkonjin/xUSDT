/**
 * @plasma-pay/agent - PlasmaPayClient
 * 
 * The main client for AI agents to make payments on Plasma
 */

import { 
  createPublicClient, 
  http, 
  formatUnits, 
  parseUnits,
  type PublicClient,
  type Address,
  type Hex
} from 'viem';
import { plasma, USDT0_ADDRESSES } from './chains';
import { PlasmaSigner, generateNonce } from './signer';
import type {
  PlasmaPayConfig,
  PaymentRequired,
  PaymentSubmitted,
  PaymentReceipt,
  PaymentOption,
  BalanceInfo,
  PlasmaPayError,
  PlasmaPayEvent,
  PlasmaPayEventHandler,
  PLASMA_CHAIN_ID,
  USDT0_DECIMALS,
  XPL_DECIMALS,
} from './types';

// Default configuration
const DEFAULT_CONFIG: Partial<PlasmaPayConfig> = {
  facilitatorUrl: 'https://pay.plasma.xyz',
  plasmaRpcUrl: 'https://rpc.plasma.xyz',
  maxAmountPerRequest: BigInt(1_000_000), // 1 USDT0
  autoPayment: true,
  preferredNetwork: 'plasma',
  debug: false,
  autoGas: true,
  minGasBalance: BigInt(10_000_000_000_000_000), // 0.01 XPL
};

// ERC20 ABI for balance checks
const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'version',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * PlasmaPayClient - One-click payment SDK for AI agents
 * 
 * @example
 * ```typescript
 * const client = new PlasmaPayClient({
 *   privateKey: process.env.PLASMA_WALLET_KEY,
 * });
 * 
 * // Automatic payment on 402 responses
 * const response = await client.fetch('https://api.example.com/data');
 * const data = await response.json();
 * ```
 */
export class PlasmaPayClient {
  private config: Required<PlasmaPayConfig>;
  private signer: PlasmaSigner;
  private publicClient: PublicClient;
  private eventHandlers: PlasmaPayEventHandler[] = [];

  constructor(config: PlasmaPayConfig) {
    // Validate config
    if (!config.privateKey && !config.wallet) {
      throw new Error('Either privateKey or wallet must be provided');
    }

    // Merge with defaults
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    } as Required<PlasmaPayConfig>;

    // Initialize signer
    this.signer = new PlasmaSigner(this.config);

    // Initialize public client for balance checks
    this.publicClient = createPublicClient({
      chain: plasma,
      transport: http(this.config.plasmaRpcUrl),
    });

    this.log('PlasmaPayClient initialized', { address: this.address });
  }

  /**
   * Get the wallet address
   */
  get address(): Address {
    return this.signer.address;
  }

  /**
   * Fetch with automatic payment on 402 responses
   * 
   * @example
   * ```typescript
   * const response = await client.fetch('https://api.example.com/data');
   * ```
   */
  async fetch(url: string, options?: RequestInit): Promise<Response> {
    this.log('Fetching', { url });

    // Make initial request
    let response = await fetch(url, options);

    // Check for 402 Payment Required
    if (response.status === 402 && this.config.autoPayment) {
      const paymentRequired = await this.parsePaymentRequired(response);
      
      if (paymentRequired) {
        this.emit({ type: 'payment_required', data: paymentRequired });
        
        // Execute payment
        const receipt = await this.pay(paymentRequired);
        
        // Retry request with payment header
        const newHeaders = new Headers(options?.headers);
        newHeaders.set('X-Payment', this.encodePaymentHeader(receipt));
        
        response = await fetch(url, {
          ...options,
          headers: newHeaders,
        });
      }
    }

    return response;
  }

  /**
   * Execute a payment for a PaymentRequired response
   */
  async pay(paymentRequired: PaymentRequired): Promise<PaymentReceipt> {
    this.log('Processing payment', { invoiceId: paymentRequired.invoiceId });

    // Choose the best payment option
    const option = this.choosePaymentOption(paymentRequired.paymentOptions);
    
    if (!option) {
      throw this.createError('UNSUPPORTED_SCHEME', 'No supported payment option found');
    }

    // Check amount limit
    const amount = BigInt(option.amount);
    if (amount > this.config.maxAmountPerRequest) {
      throw this.createError('AMOUNT_EXCEEDS_MAX', 
        `Payment amount ${formatUnits(amount, 6)} USDT0 exceeds maximum ${formatUnits(this.config.maxAmountPerRequest, 6)} USDT0`,
        { required: option.amount, max: this.config.maxAmountPerRequest.toString() }
      );
    }

    // Check balance
    const balance = await this.getBalance();
    if (balance.usdt0 < amount) {
      throw this.createError('INSUFFICIENT_BALANCE',
        `Insufficient USDT0 balance. Required: ${formatUnits(amount, 6)}, Available: ${balance.usdt0Formatted}`,
        { required: option.amount, available: balance.usdt0.toString() }
      );
    }

    // Check gas if self-sovereign mode
    if (!balance.hasGas && this.config.autoGas) {
      this.emit({ type: 'gas_low', balance: balance.xpl });
      // TODO: Auto-refill gas via LiFi
    }

    // Sign the payment
    const submission = await this.signPayment(paymentRequired.invoiceId, option);
    this.emit({ type: 'payment_submitted', data: submission });

    // Submit to facilitator or directly to chain
    const receipt = await this.submitPayment(submission);
    this.emit({ type: 'payment_completed', data: receipt });

    this.log('Payment completed', { txHash: receipt.txHash });
    return receipt;
  }

  /**
   * Get USDT0 and XPL balances
   */
  async getBalance(): Promise<BalanceInfo> {
    const usdt0Address = USDT0_ADDRESSES[9745];
    
    // Get USDT0 balance
    let usdt0 = BigInt(0);
    try {
      usdt0 = await this.publicClient.readContract({
        address: usdt0Address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [this.address],
      }) as bigint;
    } catch (e) {
      this.log('Failed to get USDT0 balance', { error: e });
    }

    // Get XPL (native) balance
    const xpl = await this.publicClient.getBalance({
      address: this.address,
    });

    const minGas = this.config.minGasBalance;

    return {
      usdt0,
      xpl,
      usdt0Formatted: formatUnits(usdt0, 6),
      xplFormatted: formatUnits(xpl, 18),
      hasGas: xpl >= minGas,
    };
  }

  /**
   * Subscribe to payment events
   */
  on(handler: PlasmaPayEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      const index = this.eventHandlers.indexOf(handler);
      if (index > -1) {
        this.eventHandlers.splice(index, 1);
      }
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async parsePaymentRequired(response: Response): Promise<PaymentRequired | null> {
    // Try X-Payment-Required header first
    const header = response.headers.get('X-Payment-Required') || 
                   response.headers.get('PAYMENT-REQUIRED');
    
    if (header) {
      try {
        const decoded = JSON.parse(atob(header));
        return decoded as PaymentRequired;
      } catch (e) {
        this.log('Failed to parse payment header', { error: e });
      }
    }

    // Try response body
    try {
      const body = await response.json();
      if (body.type === 'payment-required') {
        return body as PaymentRequired;
      }
    } catch (e) {
      this.log('Failed to parse payment body', { error: e });
    }

    return null;
  }

  private choosePaymentOption(options: PaymentOption[]): PaymentOption | null {
    // Prefer Plasma network
    const plasmaOptions = options.filter(o => 
      o.network === 'eip155:9745' || 
      o.network === 'plasma' || 
      o.chainId === 9745
    );

    if (plasmaOptions.length > 0) {
      // Prefer EIP-3009 schemes
      const eip3009 = plasmaOptions.find(o => 
        o.scheme === 'eip3009-transfer-with-auth' || 
        o.scheme === 'eip3009-receive'
      );
      if (eip3009) return eip3009;
      return plasmaOptions[0];
    }

    // Fall back to any supported option
    return options.find(o => 
      o.scheme === 'eip3009-transfer-with-auth' ||
      o.scheme === 'eip3009-receive' ||
      o.scheme === 'erc20-gasless-router'
    ) || null;
  }

  private async signPayment(invoiceId: string, option: PaymentOption): Promise<PaymentSubmitted> {
    const now = Math.floor(Date.now() / 1000);
    const validAfter = now - 60; // 1 minute ago
    const validBefore = option.deadline || now + 600; // 10 minutes from now

    // Get token metadata
    let tokenName = 'USDT0';
    let tokenVersion = '1';
    
    try {
      tokenName = await this.publicClient.readContract({
        address: option.token,
        abi: ERC20_ABI,
        functionName: 'name',
      }) as string;
    } catch (e) {
      this.log('Using default token name');
    }

    // Sign based on scheme
    if (option.scheme === 'eip3009-transfer-with-auth') {
      const auth = await this.signer.signTransferWithAuth({
        tokenName,
        tokenVersion,
        chainId: option.chainId,
        tokenAddress: option.token,
        to: option.recipient,
        value: BigInt(option.amount),
        validAfter,
        validBefore,
        nonce: option.nonce as Hex,
      });

      return {
        type: 'payment-submitted',
        invoiceId,
        authorization: auth,
        scheme: option.scheme,
      };
    }

    if (option.scheme === 'eip3009-receive') {
      const auth = await this.signer.signReceiveWithAuth({
        tokenName,
        tokenVersion,
        chainId: option.chainId,
        tokenAddress: option.token,
        to: option.routerContract || option.recipient,
        value: BigInt(option.amount),
        validAfter,
        validBefore,
        nonce: option.nonce as Hex,
      });

      return {
        type: 'payment-submitted',
        invoiceId,
        authorization: auth,
        scheme: option.scheme,
      };
    }

    throw this.createError('UNSUPPORTED_SCHEME', `Unsupported payment scheme: ${option.scheme}`);
  }

  private async submitPayment(submission: PaymentSubmitted): Promise<PaymentReceipt> {
    // Submit to facilitator
    const response = await fetch(`${this.config.facilitatorUrl}/api/v1/settle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submission),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw this.createError('FACILITATOR_ERROR', error.message || 'Payment settlement failed');
    }

    const result = await response.json();
    
    return {
      type: 'payment-completed',
      invoiceId: submission.invoiceId,
      txHash: result.txHash,
      timestamp: Date.now(),
      amount: (submission.authorization as any).value,
      token: '0x0000000000000000000000000000000000000000' as Address,
      network: 'eip155:9745',
    };
  }

  private encodePaymentHeader(receipt: PaymentReceipt): string {
    return btoa(JSON.stringify(receipt));
  }

  private createError(code: string, message: string, details?: Record<string, unknown>): Error {
    const error = new Error(message) as any;
    error.code = code;
    error.details = details;
    return error;
  }

  private emit(event: PlasmaPayEvent): void {
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
      console.log(`[PlasmaPayClient] ${message}`, data || '');
    }
  }
}
