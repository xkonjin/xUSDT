/**
 * @plasma-pay/facilitator - X402 Express Middleware
 *
 * Express middleware for handling X402 payments on Plasma chain.
 * Based on baghdadgherras/x402-usdt0 server implementation.
 */

import { Request, Response, NextFunction } from "express";
import { PlasmaFacilitator } from "./facilitator";
import { Address, Hex, X402PaymentPayload, PLASMA_MAINNET } from "./types";

// ============================================================================
// Types
// ============================================================================

export interface X402MiddlewareConfig {
  /** Facilitator instance or private key */
  facilitator: PlasmaFacilitator | Hex;
  /** Price per request in USDT0 (6 decimals) */
  pricePerRequest: bigint;
  /** Recipient address for payments */
  recipientAddress: Address;
  /** Optional: Custom payment verification */
  verifyPayment?: (payload: X402PaymentPayload) => Promise<boolean>;
  /** Optional: Skip payment for certain routes */
  skipRoutes?: string[];
  /** Optional: Free tier requests per IP */
  freeTierRequests?: number;
}

export interface X402Request extends Request {
  x402?: {
    paid: boolean;
    amount: bigint;
    from: Address;
    transactionHash?: Hex;
  };
}

// ============================================================================
// Middleware Factory
// ============================================================================

/**
 * Create X402 payment middleware for Express.
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { createX402Middleware, PlasmaFacilitator } from '@plasma-pay/facilitator';
 *
 * const app = express();
 * const facilitator = new PlasmaFacilitator({ privateKey: '0x...' });
 *
 * app.use('/api', createX402Middleware({
 *   facilitator,
 *   pricePerRequest: 1000000n, // 1 USDT0
 *   recipientAddress: '0x...',
 * }));
 * ```
 */
export function createX402Middleware(config: X402MiddlewareConfig) {
  // Create facilitator if private key provided
  const facilitator =
    config.facilitator instanceof PlasmaFacilitator
      ? config.facilitator
      : new PlasmaFacilitator({ privateKey: config.facilitator });

  // Track free tier usage by IP
  const freeTierUsage = new Map<string, number>();
  const freeTierLimit = config.freeTierRequests || 0;

  // Track used nonces to prevent replay attacks
  const usedNonces = new Set<string>();

  return async function x402Middleware(
    req: X402Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      // Skip certain routes
      if (config.skipRoutes?.some((route) => req.path.startsWith(route))) {
        return next();
      }

      // Check free tier
      const clientIP = req.ip || req.socket.remoteAddress || "unknown";
      const currentUsage = freeTierUsage.get(clientIP) || 0;

      if (freeTierLimit > 0 && currentUsage < freeTierLimit) {
        freeTierUsage.set(clientIP, currentUsage + 1);
        req.x402 = { paid: false, amount: 0n, from: "0x0" as Address };
        return next();
      }

      // Check for X-Payment header
      const paymentHeader = req.headers["x-payment"] as string;

      if (!paymentHeader) {
        // Return 402 Payment Required
        return res.status(402).json({
          error: "Payment Required",
          x402: {
            version: "1",
            scheme: "eip3009-transfer-with-auth",
            network: "plasma",
            chainId: PLASMA_MAINNET.chainId,
            token: PLASMA_MAINNET.usdt0Address,
            recipient: config.recipientAddress,
            amount: config.pricePerRequest.toString(),
            description: "Payment required to access this resource",
          },
        });
      }

      // Parse payment payload
      let payment: X402PaymentPayload;
      try {
        payment = JSON.parse(paymentHeader);
      } catch {
        return res.status(400).json({
          error: "Invalid X-Payment header",
          details: "Could not parse payment payload",
        });
      }

      // Validate payment scheme
      if (payment.scheme !== "eip3009-transfer-with-auth") {
        return res.status(400).json({
          error: "Unsupported payment scheme",
          details: `Expected 'eip3009-transfer-with-auth', got '${payment.scheme}'`,
        });
      }

      // Validate payment amount
      const paymentAmount = BigInt(payment.payload.value);
      if (paymentAmount < config.pricePerRequest) {
        return res.status(402).json({
          error: "Insufficient payment",
          required: config.pricePerRequest.toString(),
          provided: paymentAmount.toString(),
        });
      }

      // Validate recipient
      if (
        payment.payload.to.toLowerCase() !==
        config.recipientAddress.toLowerCase()
      ) {
        return res.status(400).json({
          error: "Invalid recipient",
          expected: config.recipientAddress,
          provided: payment.payload.to,
        });
      }

      // Check nonce for replay attack
      const nonceKey = `${payment.payload.from}-${payment.payload.nonce}`;
      if (usedNonces.has(nonceKey)) {
        return res.status(400).json({
          error: "Nonce already used",
          details: "This authorization has already been processed",
        });
      }

      // Validate time window
      const now = BigInt(Math.floor(Date.now() / 1000));
      const validAfter = BigInt(payment.payload.validAfter);
      const validBefore = BigInt(payment.payload.validBefore);

      if (now < validAfter) {
        return res.status(400).json({
          error: "Authorization not yet valid",
          validAfter: validAfter.toString(),
          currentTime: now.toString(),
        });
      }

      if (now >= validBefore) {
        return res.status(400).json({
          error: "Authorization expired",
          validBefore: validBefore.toString(),
          currentTime: now.toString(),
        });
      }

      // Custom verification if provided
      if (config.verifyPayment) {
        const isValid = await config.verifyPayment(payment);
        if (!isValid) {
          return res.status(400).json({
            error: "Payment verification failed",
          });
        }
      }

      // Check if authorization already used on-chain
      const isUsed = await facilitator.isAuthorizationUsed(
        payment.payload.from as Address,
        payment.payload.nonce as Hex
      );

      if (isUsed) {
        return res.status(400).json({
          error: "Authorization already used on-chain",
        });
      }

      // Parse signature
      const signature = payment.payload.signature;
      const r = ("0x" + signature.slice(2, 66)) as Hex;
      const s = ("0x" + signature.slice(66, 130)) as Hex;
      const v = parseInt(signature.slice(130, 132), 16);

      // Execute the transfer
      const txHash = await facilitator.executeTransferWithAuthorization({
        from: payment.payload.from as Address,
        to: payment.payload.to as Address,
        value: paymentAmount,
        validAfter,
        validBefore,
        nonce: payment.payload.nonce as Hex,
        v,
        r,
        s,
      });

      // Wait for confirmation
      const receipt = await facilitator.waitForTransactionReceipt({
        hash: txHash,
      });

      if (receipt.status !== "success") {
        return res.status(500).json({
          error: "Payment transaction reverted",
          transactionHash: txHash,
        });
      }

      // Mark nonce as used
      usedNonces.add(nonceKey);

      // Attach payment info to request
      req.x402 = {
        paid: true,
        amount: paymentAmount,
        from: payment.payload.from as Address,
        transactionHash: txHash,
      };

      // Continue to next middleware
      next();
    } catch (error) {
      console.error("X402 middleware error:", error);
      return res.status(500).json({
        error: "Payment processing failed",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a 402 Payment Required response.
 */
export function create402Response(config: {
  amount: bigint;
  recipient: Address;
  description?: string;
}) {
  return {
    error: "Payment Required",
    x402: {
      version: "1",
      scheme: "eip3009-transfer-with-auth",
      network: "plasma",
      chainId: PLASMA_MAINNET.chainId,
      token: PLASMA_MAINNET.usdt0Address,
      recipient: config.recipient,
      amount: config.amount.toString(),
      description: config.description || "Payment required",
    },
  };
}

/**
 * Parse X-Payment header.
 */
export function parseX402Header(header: string): X402PaymentPayload | null {
  try {
    return JSON.parse(header);
  } catch {
    return null;
  }
}
