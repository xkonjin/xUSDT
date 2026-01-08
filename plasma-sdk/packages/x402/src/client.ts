/**
 * X402 Payment Client
 * 
 * Automatically handle 402 responses by signing and submitting payments
 */

import type { Address, Hex } from 'viem';
import {
  USDT0_ADDRESS,
  PLASMA_MAINNET_CHAIN_ID,
  generateNonce,
  getValidityWindow,
  splitSignature,
} from '@plasma-pay/core';
import { buildTransferAuthorizationTypedData } from '@plasma-pay/gasless';
import type {
  X402ClientConfig,
  X402PaymentRequired,
  X402PaymentSubmitted,
  X402PaymentOption,
} from './types';
import { X402_HEADERS } from './types';

/**
 * Decode payment required from header
 */
function decodePaymentRequired(encoded: string): X402PaymentRequired {
  return JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'));
}

/**
 * Encode payment submission for header
 */
function encodePaymentSubmitted(payment: X402PaymentSubmitted): string {
  return Buffer.from(JSON.stringify(payment)).toString('base64');
}

/**
 * X402 Client for automatic payment handling
 */
export class X402Client {
  private config: X402ClientConfig;

  constructor(config: X402ClientConfig) {
    this.config = {
      autoPayment: true,
      ...config,
    };
  }

  /**
   * Fetch a resource, automatically handling 402 responses
   */
  async fetch(
    path: string,
    init?: RequestInit
  ): Promise<Response> {
    const url = path.startsWith('http') ? path : `${this.config.baseUrl}${path}`;

    // First request
    let response = await fetch(url, init);

    // If not 402, return as-is
    if (response.status !== 402) {
      return response;
    }

    // Don't auto-pay if disabled
    if (!this.config.autoPayment) {
      return response;
    }

    // Get payment requirements
    const paymentRequiredHeader = response.headers.get(X402_HEADERS.PAYMENT_REQUIRED);
    if (!paymentRequiredHeader) {
      throw new Error('402 response missing payment requirements');
    }

    const paymentRequired = decodePaymentRequired(paymentRequiredHeader);

    // Find suitable payment option
    const option = this.selectPaymentOption(paymentRequired.paymentOptions);
    if (!option) {
      throw new Error('No suitable payment option available');
    }

    // Check max amount
    if (this.config.maxAmountPerRequest) {
      const amount = BigInt(option.amount);
      if (amount > this.config.maxAmountPerRequest) {
        throw new Error(
          `Payment amount ${amount} exceeds max ${this.config.maxAmountPerRequest}`
        );
      }
    }

    // Sign the payment
    const payment = await this.signPayment(paymentRequired.invoiceId, option);

    // Retry with payment
    response = await fetch(url, {
      ...init,
      headers: {
        ...init?.headers,
        [X402_HEADERS.PAYMENT]: encodePaymentSubmitted(payment),
      },
    });

    return response;
  }

  /**
   * Select the best payment option based on preferences
   */
  private selectPaymentOption(options: X402PaymentOption[]): X402PaymentOption | null {
    // Filter by preferred chain if set
    let filtered = options;
    if (this.config.preferredChainId) {
      const byChain = options.filter(o => o.chainId === this.config.preferredChainId);
      if (byChain.length > 0) filtered = byChain;
    }

    // Filter by preferred token if set
    if (this.config.preferredToken) {
      const byToken = filtered.filter(
        o => o.token.toLowerCase() === this.config.preferredToken!.toLowerCase()
      );
      if (byToken.length > 0) filtered = byToken;
    }

    // Return first available option
    return filtered[0] ?? null;
  }

  /**
   * Sign a payment authorization
   */
  private async signPayment(
    invoiceId: string,
    option: X402PaymentOption
  ): Promise<X402PaymentSubmitted> {
    const nonce = generateNonce();
    const { validAfter, validBefore } = getValidityWindow(3600); // 1 hour validity

    const typedData = buildTransferAuthorizationTypedData(
      {
        from: this.config.wallet.address,
        to: option.recipient,
        value: BigInt(option.amount),
        validAfter,
        validBefore,
        nonce,
      },
      {
        chainId: option.chainId,
        tokenAddress: option.token,
      }
    );

    const signature = await this.config.wallet.signTypedData(typedData);
    const { v, r, s } = splitSignature(signature);

    return {
      type: 'payment-submitted',
      invoiceId,
      chosenOption: option,
      authorization: {
        from: this.config.wallet.address,
        to: option.recipient,
        value: option.amount,
        validAfter,
        validBefore,
        nonce,
        v,
        r,
        s,
      },
    };
  }

  /**
   * Get payment requirements for a URL without paying
   */
  async getPaymentRequirements(path: string): Promise<X402PaymentRequired | null> {
    const url = path.startsWith('http') ? path : `${this.config.baseUrl}${path}`;
    
    const response = await fetch(url, { method: 'GET' });
    
    if (response.status !== 402) {
      return null;
    }

    const header = response.headers.get(X402_HEADERS.PAYMENT_REQUIRED);
    if (!header) {
      return null;
    }

    return decodePaymentRequired(header);
  }

  /**
   * Manually pay for access without fetching the resource
   */
  async pay(paymentRequired: X402PaymentRequired): Promise<X402PaymentSubmitted> {
    const option = this.selectPaymentOption(paymentRequired.paymentOptions);
    if (!option) {
      throw new Error('No suitable payment option available');
    }

    return this.signPayment(paymentRequired.invoiceId, option);
  }
}

/**
 * Create an X402 client
 */
export function createX402Client(config: X402ClientConfig): X402Client {
  return new X402Client(config);
}

/**
 * Simple fetch wrapper for one-off X402 requests
 */
export async function x402Fetch(
  url: string,
  wallet: X402ClientConfig['wallet'],
  init?: RequestInit
): Promise<Response> {
  const client = new X402Client({
    wallet,
    baseUrl: '',
  });
  return client.fetch(url, init);
}
