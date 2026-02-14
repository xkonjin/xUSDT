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
  type Hex,
} from "viem";
import { plasma, USDT0_ADDRESSES } from "./chains";
import { PlasmaSigner, generateNonce } from "./signer";
import type {
  PlasmaPayConfig,
  PaymentRequired,
  PaymentSubmitted,
  PaymentReceipt,
  PaymentOption,
  BalanceInfo,
  PlasmaPayEvent,
  PlasmaPayEventHandler,
} from "./types";

// Default configuration
const DEFAULT_CONFIG: Partial<PlasmaPayConfig> = {
  facilitatorUrl: "https://pay.plasma.xyz",
  plasmaRpcUrl: "https://rpc.plasma.xyz",
  maxAmountPerRequest: BigInt(1_000_000), // 1 USDT0
  autoPayment: true,
  preferredNetwork: "plasma",
  debug: false,
  autoGas: true,
  minGasBalance: BigInt(10_000_000_000_000_000), // 0.01 XPL
  timeout: 30000, // 30 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second base delay
};

// ERC20 ABI for balance checks
const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "version",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Custom error class for Plasma Pay errors
 */
export class PlasmaPayError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "PlasmaPayError";
    this.code = code;
    this.details = details;
  }
}

/**
 * PlasmaPayClient - One-click payment SDK for AI agents
 *
 * @example
 * ```typescript
 * const client = new PlasmaPayClient({
 *   privateKey: process.env.PLASMA_WALLET_KEY,
 * });
 *
 * // Simple payment
 * await client.sendPayment({ to: '0x...', amount: '10.00' });
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
  private pendingPayments: Set<string> = new Set(); // Track in-flight payments

  constructor(config: PlasmaPayConfig) {
    // Validate config
    if (!config.privateKey && !config.wallet) {
      throw new PlasmaPayError(
        "INVALID_CONFIG",
        "Either privateKey or wallet must be provided"
      );
    }

    // Validate private key format if provided
    if (config.privateKey && !this.isValidPrivateKey(config.privateKey)) {
      throw new PlasmaPayError(
        "INVALID_PRIVATE_KEY",
        "Private key must be a valid 32-byte hex string starting with 0x"
      );
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

    this.log("PlasmaPayClient initialized", { address: this.address });
  }

  /**
   * Validate private key format
   */
  private isValidPrivateKey(key: string): boolean {
    return /^0x[a-fA-F0-9]{64}$/.test(key);
  }

  /**
   * Get the wallet address
   */
  get address(): Address {
    return this.signer.address;
  }

  /**
   * Send a simple payment to an address
   *
   * @example
   * ```typescript
   * await client.sendPayment({
   *   to: '0x1234...',
   *   amount: '10.00', // 10 USDT0
   *   note: 'Payment for services',
   * });
   * ```
   */
  async sendPayment(params: {
    to: Address;
    amount: string;
    note?: string;
  }): Promise<PaymentReceipt> {
    // Validate address
    if (!this.isValidAddress(params.to)) {
      throw new PlasmaPayError("INVALID_ADDRESS", "Invalid recipient address");
    }

    // Validate amount
    const amount = this.parseAmount(params.amount);
    if (amount <= BigInt(0)) {
      throw new PlasmaPayError(
        "INVALID_AMOUNT",
        "Amount must be greater than 0"
      );
    }

    // Check balance
    const balance = await this.getBalance();
    if (balance.usdt0 < amount) {
      throw new PlasmaPayError(
        "INSUFFICIENT_BALANCE",
        `Insufficient USDT0 balance. Required: ${params.amount}, Available: ${balance.usdt0Formatted}`,
        { required: amount.toString(), available: balance.usdt0.toString() }
      );
    }

    // Check gas
    if (!balance.hasGas) {
      this.emit({ type: "gas_low", balance: balance.xpl });
      if (this.config.autoGas) {
        this.log("Low gas balance, auto-refill not yet implemented");
      }
    }

    const usdt0Address = USDT0_ADDRESSES[98866];
    const invoiceId = `direct-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;

    // Create payment option for direct transfer
    const option: PaymentOption = {
      scheme: "eip3009-transfer-with-auth",
      network: "eip155:98866",
      asset: `eip155:98866/erc20:${usdt0Address}`,
      chainId: 98866,
      token: usdt0Address,
      amount: amount.toString(),
      recipient: params.to,
      nonce: generateNonce(),
      deadline: Math.floor(Date.now() / 1000) + 3600,
    };

    // Sign and submit
    const submission = await this.signPayment(invoiceId, option);
    this.emit({ type: "payment_submitted", data: submission });

    const receipt = await this.submitPayment(submission, option.token);
    this.emit({ type: "payment_completed", data: receipt });

    this.log("Payment completed", {
      txHash: receipt.txHash,
      to: params.to,
      amount: params.amount,
    });
    return receipt;
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
    this.log("Fetching", { url });

    // Make initial request with timeout
    let response = await this.fetchWithTimeout(url, options);

    // Check for 402 Payment Required
    if (response.status === 402 && this.config.autoPayment) {
      const paymentRequired = await this.parsePaymentRequired(response);

      if (paymentRequired) {
        this.emit({ type: "payment_required", data: paymentRequired });

        // Execute payment
        const receipt = await this.pay(paymentRequired);

        // Retry request with payment header
        const newHeaders = new Headers(options?.headers);
        newHeaders.set("X-Payment", this.encodePaymentHeader(receipt));

        response = await this.fetchWithTimeout(url, {
          ...options,
          headers: newHeaders,
        });
      }
    }

    return response;
  }

  /**
   * Fetch with timeout support
   */
  private async fetchWithTimeout(
    url: string,
    options?: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new PlasmaPayError(
          "TIMEOUT",
          `Request timed out after ${this.config.timeout}ms`
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Execute a payment for a PaymentRequired response
   */
  async pay(paymentRequired: PaymentRequired): Promise<PaymentReceipt> {
    const invoiceId = paymentRequired.invoiceId;
    this.log("Processing payment", { invoiceId });

    // Check for duplicate payment
    if (this.pendingPayments.has(invoiceId)) {
      throw new PlasmaPayError(
        "DUPLICATE_PAYMENT",
        "Payment already in progress for this invoice"
      );
    }

    this.pendingPayments.add(invoiceId);

    try {
      // Choose the best payment option
      const option = this.choosePaymentOption(paymentRequired.paymentOptions);

      if (!option) {
        throw new PlasmaPayError(
          "UNSUPPORTED_SCHEME",
          "No supported payment option found"
        );
      }

      // Validate amount
      const amount = BigInt(option.amount);
      if (amount <= BigInt(0)) {
        throw new PlasmaPayError(
          "INVALID_AMOUNT",
          "Payment amount must be greater than 0"
        );
      }

      // Check amount limit
      if (amount > this.config.maxAmountPerRequest) {
        throw new PlasmaPayError(
          "AMOUNT_EXCEEDS_MAX",
          `Payment amount ${formatUnits(
            amount,
            6
          )} USDT0 exceeds maximum ${formatUnits(
            this.config.maxAmountPerRequest,
            6
          )} USDT0`,
          {
            required: option.amount,
            max: this.config.maxAmountPerRequest.toString(),
          }
        );
      }

      // Check balance
      const balance = await this.getBalance();
      if (balance.usdt0 < amount) {
        throw new PlasmaPayError(
          "INSUFFICIENT_BALANCE",
          `Insufficient USDT0 balance. Required: ${formatUnits(
            amount,
            6
          )}, Available: ${balance.usdt0Formatted}`,
          { required: option.amount, available: balance.usdt0.toString() }
        );
      }

      // Check gas if self-sovereign mode
      if (!balance.hasGas && this.config.autoGas) {
        this.emit({ type: "gas_low", balance: balance.xpl });
      }

      // Validate nonce if provided
      if (option.nonce && !this.isValidNonce(option.nonce)) {
        throw new PlasmaPayError("INVALID_NONCE", "Invalid nonce format");
      }

      // Sign the payment
      const submission = await this.signPayment(invoiceId, option);
      this.emit({ type: "payment_submitted", data: submission });

      // Submit to facilitator with retry
      const receipt = await this.submitPaymentWithRetry(
        submission,
        option.token
      );
      this.emit({ type: "payment_completed", data: receipt });

      this.log("Payment completed", { txHash: receipt.txHash });
      return receipt;
    } finally {
      this.pendingPayments.delete(invoiceId);
    }
  }

  /**
   * Get USDT0 and XPL balances
   */
  async getBalance(): Promise<BalanceInfo> {
    const usdt0Address = USDT0_ADDRESSES[98866];

    // Get USDT0 balance
    let usdt0 = BigInt(0);
    try {
      usdt0 = (await this.publicClient.readContract({
        address: usdt0Address,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [this.address],
      })) as bigint;
    } catch (e) {
      this.log("Failed to get USDT0 balance", { error: e });
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

  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  private isValidNonce(nonce: string): boolean {
    return /^0x[a-fA-F0-9]{64}$/.test(nonce);
  }

  private parseAmount(amount: string): bigint {
    try {
      // Handle both "10.00" and "10000000" formats
      if (amount.includes(".")) {
        return parseUnits(amount, 6);
      }
      return BigInt(amount);
    } catch {
      throw new PlasmaPayError(
        "INVALID_AMOUNT",
        `Invalid amount format: ${amount}`
      );
    }
  }

  private async parsePaymentRequired(
    response: Response
  ): Promise<PaymentRequired | null> {
    // Try X-Payment-Required header first (X402 standard)
    const header =
      response.headers.get("X-Payment-Required") ||
      response.headers.get("PAYMENT-REQUIRED");

    if (header) {
      try {
        const decoded = JSON.parse(atob(header));
        return decoded as PaymentRequired;
      } catch (e) {
        this.log("Failed to parse payment header", { error: e });
      }
    }

    // Try response body
    try {
      const body = await response.json();
      if (body.type === "payment-required") {
        return body as PaymentRequired;
      }
    } catch (e) {
      this.log("Failed to parse payment body", { error: e });
    }

    return null;
  }

  private choosePaymentOption(options: PaymentOption[]): PaymentOption | null {
    // Prefer Plasma network
    const plasmaOptions = options.filter(
      (o) =>
        o.network === "eip155:98866" ||
        o.network === "plasma" ||
        o.chainId === 98866
    );

    if (plasmaOptions.length > 0) {
      // Prefer EIP-3009 schemes
      const eip3009 = plasmaOptions.find(
        (o) =>
          o.scheme === "eip3009-transfer-with-auth" ||
          o.scheme === "eip3009-receive"
      );
      if (eip3009) return eip3009;
      return plasmaOptions[0];
    }

    // Fall back to any supported option
    return (
      options.find(
        (o) =>
          o.scheme === "eip3009-transfer-with-auth" ||
          o.scheme === "eip3009-receive" ||
          o.scheme === "erc20-gasless-router"
      ) || null
    );
  }

  private async signPayment(
    invoiceId: string,
    option: PaymentOption
  ): Promise<PaymentSubmitted> {
    const now = Math.floor(Date.now() / 1000);
    const validAfter = now - 60; // 1 minute ago
    const validBefore = option.deadline || now + 600; // 10 minutes from now

    // Get token metadata
    let tokenName = "USDT0";
    const tokenVersion = "1";

    try {
      tokenName = (await this.publicClient.readContract({
        address: option.token,
        abi: ERC20_ABI,
        functionName: "name",
      })) as string;
    } catch {
      this.log("Using default token name");
    }

    // Sign based on scheme
    if (option.scheme === "eip3009-transfer-with-auth") {
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
        type: "payment-submitted",
        invoiceId,
        authorization: auth,
        scheme: option.scheme,
      };
    }

    if (option.scheme === "eip3009-receive") {
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
        type: "payment-submitted",
        invoiceId,
        authorization: auth,
        scheme: option.scheme,
      };
    }

    throw new PlasmaPayError(
      "UNSUPPORTED_SCHEME",
      `Unsupported payment scheme: ${option.scheme}`
    );
  }

  private async submitPaymentWithRetry(
    submission: PaymentSubmitted,
    tokenAddress: Address
  ): Promise<PaymentReceipt> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        return await this.submitPayment(submission, tokenAddress);
      } catch (error) {
        const typedError =
          error instanceof Error ? error : new Error("Unknown error");
        lastError = typedError;

        const code =
          error instanceof PlasmaPayError ? error.code : undefined;

        if (
          code === "INSUFFICIENT_BALANCE" ||
          code === "INVALID_SIGNATURE" ||
          code === "NONCE_ALREADY_USED"
        ) {
          throw error;
        }

        const delay = this.config.retryDelay * Math.pow(2, attempt);
        this.log(`Payment submission failed, retrying in ${delay}ms`, {
          attempt: attempt + 1,
          error: typedError.message,
        });
        await this.sleep(delay);
      }
    }

    throw (
      lastError ||
      new PlasmaPayError(
        "UNKNOWN_ERROR",
        "Payment submission failed after retries"
      )
    );
  }

  private async submitPayment(
    submission: PaymentSubmitted,
    tokenAddress: Address
  ): Promise<PaymentReceipt> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      // Submit to facilitator
      const response = await fetch(
        `${this.config.facilitatorUrl}/api/v1/settle`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(submission),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ message: "Unknown error" }));
        throw new PlasmaPayError(
          "FACILITATOR_ERROR",
          error.message || "Payment settlement failed",
          { status: response.status }
        );
      }

      const result = await response.json();
      const receiptAmount =
        "value" in submission.authorization
          ? submission.authorization.value
          : submission.authorization.amount;

      return {
        type: "payment-completed",
        invoiceId: submission.invoiceId,
        txHash: result.txHash,
        timestamp: Date.now(),
        amount: receiptAmount,
        token: tokenAddress,
        network: "eip155:98866",
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new PlasmaPayError("TIMEOUT", "Payment submission timed out");
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private encodePaymentHeader(receipt: PaymentReceipt): string {
    return btoa(JSON.stringify(receipt));
  }

  private emit(event: PlasmaPayEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (e) {
        this.log("Event handler error", { error: e });
      }
    }
  }

  private log(message: string, data?: Record<string, unknown>): void {
    if (this.config.debug) {
      console.log(`[PlasmaPayClient] ${message}`, data || "");
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default PlasmaPayClient;
