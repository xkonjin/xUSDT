/**
 * X402 Middleware - Express/Connect compatible middleware
 */

import type { X402Config } from "./types";
import { verifyPayment } from "./verify";

const PLASMA_CHAIN_ID = 98866;
const USDT0_ADDRESS = "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb";
void PLASMA_CHAIN_ID;

export interface MiddlewareConfig extends X402Config {
  services?: Array<{
    path: string;
    price: string;
    description?: string;
    rateLimit?: number;
  }>;
}

export interface X402Middleware {
  requirePayment: (price: string, description?: string) => MiddlewareHandler;
  handle: MiddlewareHandler;
}

type MiddlewareHandler = (req: any, res: any, next: any) => Promise<void>;

/**
 * Create X402 middleware for Express/Connect-style frameworks
 */
export function createX402Middleware(config: MiddlewareConfig): X402Middleware {
  const { paymentAddress, network = "plasma", token, services = [] } = config;

  // Build service price map
  const priceMap = new Map<string, { price: string; description?: string }>();
  for (const service of services) {
    priceMap.set(service.path, {
      price: service.price,
      description: service.description,
    });
  }

  /**
   * Middleware that requires payment for a specific price
   */
  const requirePayment = (
    price: string,
    description?: string
  ): MiddlewareHandler => {
    return async (req: any, res: any, next: any) => {
      const paymentProof =
        req.headers["x-payment-proof"] || req.headers["X-Payment-Proof"];

      if (!paymentProof) {
        // Return 402 with payment requirements
        res.status(402);
        res.set({
          "X-Payment-Required": "true",
          "X-Payment-Address": paymentAddress,
          "X-Payment-Amount": price,
          "X-Payment-Token": token || USDT0_ADDRESS,
          "X-Payment-Network": network,
          ...(description && { "X-Payment-Description": description }),
        });
        res.json({
          error: "Payment Required",
          payment: {
            address: paymentAddress,
            amount: price,
            token: token || USDT0_ADDRESS,
            network,
            description,
          },
        });
        return;
      }

      // Verify payment
      const verification = await verifyPayment(paymentProof, {
        expectedAddress: paymentAddress as `0x${string}`,
        expectedAmount: price,
      });

      if (!verification.valid) {
        res.status(402);
        res.json({ error: verification.error || "Invalid payment" });
        return;
      }

      // Attach payment info to request
      req.payment = verification.payment;
      next();
    };
  };

  /**
   * Auto-detect middleware based on path
   */
  const handle: MiddlewareHandler = async (req: any, res: any, next: any) => {
    const path = req.path || req.url;
    const serviceConfig = priceMap.get(path);

    if (!serviceConfig) {
      // No payment required for this path
      next();
      return;
    }

    // Use requirePayment for this service
    const middleware = requirePayment(
      serviceConfig.price,
      serviceConfig.description
    );
    await middleware(req, res, next);
  };

  return {
    requirePayment,
    handle,
  };
}

/**
 * Express middleware factory
 */
export function x402Express(config: MiddlewareConfig) {
  const middleware = createX402Middleware(config);
  return middleware.handle;
}

/**
 * Hono middleware factory
 */
export function x402Hono(config: {
  paymentAddress: string;
  price: string;
  description?: string;
}) {
  return async (c: any, next: any) => {
    const paymentProof = c.req.header("X-Payment-Proof");

    if (!paymentProof) {
      return c.json(
        {
          error: "Payment Required",
          payment: {
            address: config.paymentAddress,
            amount: config.price,
            network: "plasma",
          },
        },
        402,
        {
          "X-Payment-Required": "true",
          "X-Payment-Address": config.paymentAddress,
          "X-Payment-Amount": config.price,
          "X-Payment-Network": "plasma",
        }
      );
    }

    const verification = await verifyPayment(paymentProof, {
      expectedAddress: config.paymentAddress as `0x${string}`,
      expectedAmount: config.price,
    });

    if (!verification.valid) {
      return c.json({ error: verification.error }, 402);
    }

    c.set("payment", verification.payment);
    await next();
  };
}
