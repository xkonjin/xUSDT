/**
 * X402 Payment Middleware
 * 
 * Add payment requirements to any API endpoint
 */

import type { Address, Hex } from 'viem';
import {
  USDT0_ADDRESS,
  USDT0_DECIMALS,
  USDT0_SYMBOL,
  PLASMA_MAINNET_CHAIN_ID,
  getCurrentTimestamp,
  generateNonce,
} from '@plasma-pay/core';
import type {
  X402MiddlewareConfig,
  X402PaymentRequired,
  X402PaymentSubmitted,
  X402PaymentOption,
} from './types';
import { X402_HEADERS } from './types';
import { verifyPayment, settlePayment, type FacilitatorConfig } from './facilitator';

/**
 * Generate a unique invoice ID
 */
function generateInvoiceId(): string {
  return `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Encode payment required response for header
 */
export function encodePaymentRequired(paymentRequired: X402PaymentRequired): string {
  return Buffer.from(JSON.stringify(paymentRequired)).toString('base64');
}

/**
 * Decode payment submission from header
 */
export function decodePaymentSubmitted(encoded: string): X402PaymentSubmitted {
  return JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'));
}

/**
 * Create a 402 Payment Required response
 */
export function createPaymentRequiredResponse(
  config: X402MiddlewareConfig,
  invoiceId?: string
): Response {
  const {
    pricePerRequest,
    recipient,
    description,
    tokenAddress = USDT0_ADDRESS,
    tokenSymbol = USDT0_SYMBOL,
    tokenDecimals = USDT0_DECIMALS,
    chainId = PLASMA_MAINNET_CHAIN_ID,
    network = 'plasma',
  } = config;

  const paymentOption: X402PaymentOption = {
    network,
    chainId,
    token: tokenAddress,
    tokenSymbol,
    tokenDecimals,
    amount: String(pricePerRequest),
    recipient,
    scheme: 'eip3009-transfer-with-auth',
    description,
  };

  const paymentRequired: X402PaymentRequired = {
    type: 'payment-required',
    version: '1.0',
    invoiceId: invoiceId ?? generateInvoiceId(),
    timestamp: getCurrentTimestamp(),
    paymentOptions: [paymentOption],
    description,
  };

  const response = new Response(
    JSON.stringify({
      error: 'Payment Required',
      ...paymentRequired,
    }),
    {
      status: 402,
      headers: {
        'Content-Type': 'application/json',
        [X402_HEADERS.PAYMENT_REQUIRED]: encodePaymentRequired(paymentRequired),
      },
    }
  );

  return response;
}

/**
 * Process incoming payment and verify/settle
 */
export async function processPayment(
  paymentHeader: string,
  config: X402MiddlewareConfig
): Promise<{
  valid: boolean;
  txHash?: string;
  error?: string;
}> {
  try {
    const payment = decodePaymentSubmitted(paymentHeader);
    
    // Skip verification if configured (for testing)
    if (config.skipVerification) {
      return { valid: true, txHash: '0x' + '0'.repeat(64) };
    }

    const facilitatorConfig: FacilitatorConfig = {
      relayerUrl: config.facilitatorUrl,
      chainId: config.chainId,
      tokenAddress: config.tokenAddress,
    };

    const verification = await verifyPayment(payment, facilitatorConfig);
    if (!verification.valid) {
      return { valid: false, error: verification.error };
    }

    const settlement = await settlePayment(payment, facilitatorConfig);
    if (!settlement.success) {
      return { valid: false, error: settlement.error };
    }

    return { valid: true, txHash: settlement.txHash };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * X402 middleware wrapper for fetch handlers
 * 
 * @example
 * ```ts
 * export const GET = withX402Payment({
 *   pricePerRequest: 100000, // 0.1 USDT
 *   recipient: '0x...',
 *   description: 'Premium API access',
 * })(async (request) => {
 *   return Response.json({ data: 'premium content' });
 * });
 * ```
 */
export function withX402Payment(config: X402MiddlewareConfig) {
  return function middleware(
    handler: (request: Request) => Promise<Response> | Response
  ) {
    return async function wrappedHandler(request: Request): Promise<Response> {
      // Check for payment header
      const paymentHeader = request.headers.get(X402_HEADERS.PAYMENT);

      // If no payment, return 402
      if (!paymentHeader) {
        return createPaymentRequiredResponse(config);
      }

      // Process and verify payment
      const result = await processPayment(paymentHeader, config);

      if (!result.valid) {
        return new Response(
          JSON.stringify({
            error: 'Payment Failed',
            message: result.error,
          }),
          {
            status: 402,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Payment successful - call the original handler
      const response = await handler(request);

      // Add payment receipt to response
      const receipt = {
        type: 'payment-completed',
        txHash: result.txHash,
        timestamp: getCurrentTimestamp(),
      };

      // Clone response and add header
      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
      newResponse.headers.set(
        X402_HEADERS.PAYMENT_RECEIPT,
        Buffer.from(JSON.stringify(receipt)).toString('base64')
      );

      return newResponse;
    };
  };
}

/**
 * Express-style middleware (for non-Edge environments)
 */
export function x402Middleware(config: X402MiddlewareConfig) {
  return async (
    req: { headers: { get?: (key: string) => string | null; [key: string]: any } },
    res: {
      status: (code: number) => any;
      json: (data: any) => any;
      set: (key: string, value: string) => any;
    },
    next: () => void
  ) => {
    const getHeader = (key: string): string | null => {
      if (typeof req.headers.get === 'function') {
        return req.headers.get(key);
      }
      return req.headers[key.toLowerCase()] ?? null;
    };

    const paymentHeader = getHeader(X402_HEADERS.PAYMENT);

    if (!paymentHeader) {
      const paymentRequired = createPaymentRequiredResponse(config);
      const body = await paymentRequired.json();
      return res.status(402).json(body);
    }

    const result = await processPayment(paymentHeader, config);

    if (!result.valid) {
      return res.status(402).json({
        error: 'Payment Failed',
        message: result.error,
      });
    }

    // Add receipt to response
    res.set(X402_HEADERS.PAYMENT_RECEIPT, Buffer.from(JSON.stringify({
      type: 'payment-completed',
      txHash: result.txHash,
      timestamp: getCurrentTimestamp(),
    })).toString('base64'));

    next();
  };
}
