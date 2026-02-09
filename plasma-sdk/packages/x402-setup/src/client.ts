/**
 * X402 Setup Client - Easy payment integration for websites and agents
 *
 * Provides code generators and setup guides for integrating X402 payments
 */

import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { generateMnemonic, english } from "viem/accounts";
import type { Address, Hex } from "viem";
import type {
  X402Config,
  PaywallConfig,
  X402Headers,
  SetupGuide,
  Framework,
  AgentSetupConfig,
  AgentSetupResult,
} from "./types";

// Plasma chain configuration
const PLASMA_CHAIN_ID = 98866;
const USDT0_ADDRESS = "0x..."; // TODO: Replace with actual USDT0 address
void PLASMA_CHAIN_ID;

export class X402SetupClient {
  private config: X402Config;

  constructor(config: X402Config) {
    this.config = {
      network: "plasma",
      useFacilitator: false,
      ...config,
    };
  }

  /**
   * Generate X402 headers for a paywall response
   */
  generatePaywallHeaders(paywall: PaywallConfig): X402Headers {
    const headers: X402Headers = {
      "X-Payment-Required": "true",
      "X-Payment-Address": this.config.paymentAddress,
      "X-Payment-Amount": paywall.price,
      "X-Payment-Token": this.config.token || USDT0_ADDRESS,
      "X-Payment-Network": this.config.network || "plasma",
    };

    if (paywall.description) {
      headers["X-Payment-Description"] = paywall.description;
    }

    if (paywall.expirySeconds) {
      const expiry = Math.floor(Date.now() / 1000) + paywall.expirySeconds;
      headers["X-Payment-Expiry"] = expiry.toString();
    }

    return headers;
  }

  /**
   * Generate setup guide for a specific framework
   */
  generateSetupGuide(framework: Framework): SetupGuide {
    const guides: Record<Framework, SetupGuide> = {
      nextjs: this.generateNextJSGuide(),
      express: this.generateExpressGuide(),
      fastify: this.generateFastifyGuide(),
      hono: this.generateHonoGuide(),
      "python-flask": this.generateFlaskGuide(),
      "python-fastapi": this.generateFastAPIGuide(),
      "vercel-edge": this.generateVercelEdgeGuide(),
      "cloudflare-workers": this.generateCloudflareGuide(),
    };

    return guides[framework];
  }

  /**
   * Generate a new agent wallet
   */
  generateAgentWallet(): {
    address: Address;
    privateKey: Hex;
    mnemonic: string;
  } {
    const mnemonic = generateMnemonic(english);
    const privateKey = generatePrivateKey();
    const pkAccount = privateKeyToAccount(privateKey);

    return {
      address: pkAccount.address,
      privateKey,
      mnemonic,
    };
  }

  /**
   * Complete agent setup with wallet generation and middleware config
   */
  setupAgent(config: AgentSetupConfig): AgentSetupResult {
    // Generate wallet if not provided
    let walletAddress = config.walletAddress;
    let privateKey = config.privateKey;
    let mnemonic: string | undefined;

    if (!walletAddress || !privateKey) {
      const wallet = this.generateAgentWallet();
      walletAddress = wallet.address;
      privateKey = wallet.privateKey;
      mnemonic = wallet.mnemonic;
    }

    // Generate middleware configuration
    const middlewareConfig = this.generateMiddlewareConfig(
      walletAddress,
      config.services
    );

    // Generate environment variables
    const envVars: Record<string, string> = {
      PLASMA_WALLET_ADDRESS: walletAddress,
      PLASMA_PRIVATE_KEY: privateKey,
      PLASMA_NETWORK: "plasma",
    };

    if (config.webhookUrl) {
      envVars.PLASMA_WEBHOOK_URL = config.webhookUrl;
    }

    // Generate setup instructions
    const instructions = [
      "1. Install the Plasma Pay SDK: npm install @plasma-pay/agent @plasma-pay/x402-setup",
      "2. Copy the environment variables to your .env file",
      "3. Add the middleware configuration to your server",
      "4. Fund your agent wallet with USDT0 on Plasma",
      `5. Your agent wallet address is: ${walletAddress}`,
      "6. Share your ZKP2P funding link to receive fiat payments",
    ];

    return {
      walletAddress,
      privateKey,
      mnemonic,
      middlewareConfig,
      envVars,
      instructions,
    };
  }

  /**
   * Generate middleware configuration for services
   */
  private generateMiddlewareConfig(
    address: Address,
    services: AgentSetupConfig["services"]
  ): string {
    const serviceConfigs = services
      .map(
        (s) => `
  {
    path: '${s.path}',
    price: '${s.price}',
    description: '${s.description}',
    ${s.rateLimit ? `rateLimit: ${s.rateLimit},` : ""}
  }`
      )
      .join(",");

    return `
import { createX402Middleware } from '@plasma-pay/x402-setup';

export const x402Middleware = createX402Middleware({
  paymentAddress: '${address}',
  network: 'plasma',
  services: [${serviceConfigs}
  ],
});
`.trim();
  }

  /**
   * Generate Next.js setup guide
   */
  private generateNextJSGuide(): SetupGuide {
    return {
      framework: "nextjs",
      steps: [
        {
          order: 1,
          title: "Install dependencies",
          description: "Add Plasma Pay SDK",
          command: "npm install @plasma-pay/agent @plasma-pay/x402-setup",
        },
        {
          order: 2,
          title: "Create middleware",
          description: "Add X402 middleware to your API routes",
        },
        {
          order: 3,
          title: "Configure environment",
          description: "Set up environment variables",
        },
        {
          order: 4,
          title: "Test payment flow",
          description: "Verify payments work end-to-end",
        },
      ],
      codeSnippets: [
        {
          filename: "middleware.ts",
          language: "typescript",
          description: "Next.js middleware for X402 payments",
          code: `
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyPayment } from '@plasma-pay/x402-setup';

export async function middleware(request: NextRequest) {
  // Check if route requires payment
  if (request.nextUrl.pathname.startsWith('/api/paid/')) {
    const paymentHeader = request.headers.get('X-Payment-Proof');
    
    if (!paymentHeader) {
      return new NextResponse(null, {
        status: 402,
        headers: {
          'X-Payment-Required': 'true',
          'X-Payment-Address': process.env.PLASMA_WALLET_ADDRESS!,
          'X-Payment-Amount': '1.00',
          'X-Payment-Token': 'USDT0',
          'X-Payment-Network': 'plasma',
        },
      });
    }

    const verification = await verifyPayment(paymentHeader);
    if (!verification.valid) {
      return new NextResponse(JSON.stringify({ error: verification.error }), {
        status: 402,
      });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/paid/:path*',
};
`.trim(),
        },
      ],
      envVars: [
        {
          name: "PLASMA_WALLET_ADDRESS",
          description: "Your wallet address to receive payments",
          required: true,
          example: "0x...",
        },
        {
          name: "PLASMA_PRIVATE_KEY",
          description: "Private key for signing (keep secret!)",
          required: true,
          example: "0x...",
        },
      ],
    };
  }

  /**
   * Generate Express.js setup guide
   */
  private generateExpressGuide(): SetupGuide {
    return {
      framework: "express",
      steps: [
        {
          order: 1,
          title: "Install dependencies",
          description: "Add Plasma Pay SDK",
          command: "npm install @plasma-pay/agent @plasma-pay/x402-setup",
        },
        {
          order: 2,
          title: "Add middleware",
          description: "Use X402 middleware in your Express app",
        },
        {
          order: 3,
          title: "Configure routes",
          description: "Mark routes that require payment",
        },
      ],
      codeSnippets: [
        {
          filename: "server.js",
          language: "javascript",
          description: "Express server with X402 payments",
          code: `
const express = require('express');
const { createX402Middleware } = require('@plasma-pay/x402-setup');

const app = express();

// X402 payment middleware
const x402 = createX402Middleware({
  paymentAddress: process.env.PLASMA_WALLET_ADDRESS,
  network: 'plasma',
});

// Protected route - requires payment
app.get('/api/premium-data', x402.requirePayment('1.00'), (req, res) => {
  res.json({ data: 'Premium content here' });
});

// Public route - no payment required
app.get('/api/public', (req, res) => {
  res.json({ data: 'Free content' });
});

app.listen(3000);
`.trim(),
        },
      ],
      envVars: [
        {
          name: "PLASMA_WALLET_ADDRESS",
          description: "Your wallet address",
          required: true,
          example: "0x...",
        },
      ],
    };
  }

  /**
   * Generate Fastify setup guide
   */
  private generateFastifyGuide(): SetupGuide {
    return {
      framework: "fastify",
      steps: [
        {
          order: 1,
          title: "Install dependencies",
          description: "Add Plasma Pay SDK",
          command: "npm install @plasma-pay/agent @plasma-pay/x402-setup",
        },
        {
          order: 2,
          title: "Register plugin",
          description: "Add X402 plugin to Fastify",
        },
      ],
      codeSnippets: [
        {
          filename: "server.ts",
          language: "typescript",
          description: "Fastify server with X402 payments",
          code: `
import Fastify from 'fastify';
import { fastifyX402Plugin } from '@plasma-pay/x402-setup/fastify';

const fastify = Fastify();

fastify.register(fastifyX402Plugin, {
  paymentAddress: process.env.PLASMA_WALLET_ADDRESS,
  network: 'plasma',
});

fastify.get('/api/paid', { preHandler: fastify.x402('1.00') }, async () => {
  return { data: 'Premium content' };
});

fastify.listen({ port: 3000 });
`.trim(),
        },
      ],
      envVars: [
        {
          name: "PLASMA_WALLET_ADDRESS",
          description: "Your wallet address",
          required: true,
          example: "0x...",
        },
      ],
    };
  }

  /**
   * Generate Hono setup guide
   */
  private generateHonoGuide(): SetupGuide {
    return {
      framework: "hono",
      steps: [
        {
          order: 1,
          title: "Install dependencies",
          description: "Add Plasma Pay SDK",
          command: "npm install @plasma-pay/agent @plasma-pay/x402-setup",
        },
        {
          order: 2,
          title: "Add middleware",
          description: "Use X402 middleware in Hono",
        },
      ],
      codeSnippets: [
        {
          filename: "index.ts",
          language: "typescript",
          description: "Hono app with X402 payments",
          code: `
import { Hono } from 'hono';
import { x402Middleware } from '@plasma-pay/x402-setup/hono';

const app = new Hono();

// Apply X402 to specific routes
app.use('/api/paid/*', x402Middleware({
  paymentAddress: process.env.PLASMA_WALLET_ADDRESS,
  price: '1.00',
}));

app.get('/api/paid/data', (c) => {
  return c.json({ data: 'Premium content' });
});

export default app;
`.trim(),
        },
      ],
      envVars: [
        {
          name: "PLASMA_WALLET_ADDRESS",
          description: "Your wallet address",
          required: true,
          example: "0x...",
        },
      ],
    };
  }

  /**
   * Generate Flask setup guide
   */
  private generateFlaskGuide(): SetupGuide {
    return {
      framework: "python-flask",
      steps: [
        {
          order: 1,
          title: "Install dependencies",
          description: "Add Plasma Pay SDK",
          command: "pip install plasma-pay",
        },
        {
          order: 2,
          title: "Add decorator",
          description: "Use @require_payment decorator",
        },
      ],
      codeSnippets: [
        {
          filename: "app.py",
          language: "python",
          description: "Flask app with X402 payments",
          code: `
from flask import Flask
from plasma_pay import require_payment, X402Config

app = Flask(__name__)

x402_config = X402Config(
    payment_address=os.environ['PLASMA_WALLET_ADDRESS'],
    network='plasma',
)

@app.route('/api/paid')
@require_payment(price='1.00', config=x402_config)
def premium_endpoint():
    return {'data': 'Premium content'}

if __name__ == '__main__':
    app.run()
`.trim(),
        },
      ],
      envVars: [
        {
          name: "PLASMA_WALLET_ADDRESS",
          description: "Your wallet address",
          required: true,
          example: "0x...",
        },
      ],
    };
  }

  /**
   * Generate FastAPI setup guide
   */
  private generateFastAPIGuide(): SetupGuide {
    return {
      framework: "python-fastapi",
      steps: [
        {
          order: 1,
          title: "Install dependencies",
          description: "Add Plasma Pay SDK",
          command: "pip install plasma-pay",
        },
        {
          order: 2,
          title: "Add dependency",
          description: "Use X402 dependency injection",
        },
      ],
      codeSnippets: [
        {
          filename: "main.py",
          language: "python",
          description: "FastAPI app with X402 payments",
          code: `
from fastapi import FastAPI, Depends
from plasma_pay import X402Dependency, X402Config

app = FastAPI()

x402 = X402Dependency(X402Config(
    payment_address=os.environ['PLASMA_WALLET_ADDRESS'],
    network='plasma',
))

@app.get('/api/paid')
async def premium_endpoint(payment: dict = Depends(x402.require('1.00'))):
    return {'data': 'Premium content', 'payment': payment}
`.trim(),
        },
      ],
      envVars: [
        {
          name: "PLASMA_WALLET_ADDRESS",
          description: "Your wallet address",
          required: true,
          example: "0x...",
        },
      ],
    };
  }

  /**
   * Generate Vercel Edge setup guide
   */
  private generateVercelEdgeGuide(): SetupGuide {
    return {
      framework: "vercel-edge",
      steps: [
        {
          order: 1,
          title: "Install dependencies",
          description: "Add Plasma Pay SDK",
          command: "npm install @plasma-pay/x402-setup",
        },
        {
          order: 2,
          title: "Create edge function",
          description: "Add X402 to edge middleware",
        },
      ],
      codeSnippets: [
        {
          filename: "api/paid.ts",
          language: "typescript",
          description: "Vercel Edge function with X402",
          code: `
import { x402EdgeHandler } from '@plasma-pay/x402-setup/vercel';

export const config = { runtime: 'edge' };

export default x402EdgeHandler({
  paymentAddress: process.env.PLASMA_WALLET_ADDRESS!,
  price: '1.00',
  handler: async (req) => {
    return new Response(JSON.stringify({ data: 'Premium content' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
});
`.trim(),
        },
      ],
      envVars: [
        {
          name: "PLASMA_WALLET_ADDRESS",
          description: "Your wallet address",
          required: true,
          example: "0x...",
        },
      ],
    };
  }

  /**
   * Generate Cloudflare Workers setup guide
   */
  private generateCloudflareGuide(): SetupGuide {
    return {
      framework: "cloudflare-workers",
      steps: [
        {
          order: 1,
          title: "Install dependencies",
          description: "Add Plasma Pay SDK",
          command: "npm install @plasma-pay/x402-setup",
        },
        { order: 2, title: "Create worker", description: "Add X402 to worker" },
      ],
      codeSnippets: [
        {
          filename: "worker.ts",
          language: "typescript",
          description: "Cloudflare Worker with X402",
          code: `
import { x402Worker } from '@plasma-pay/x402-setup/cloudflare';

export default x402Worker({
  paymentAddress: PLASMA_WALLET_ADDRESS, // From wrangler.toml secrets
  routes: {
    '/api/paid': { price: '1.00' },
  },
  handler: async (request, env) => {
    return new Response(JSON.stringify({ data: 'Premium content' }));
  },
});
`.trim(),
        },
      ],
      envVars: [
        {
          name: "PLASMA_WALLET_ADDRESS",
          description: "Your wallet address (add to wrangler.toml)",
          required: true,
          example: "0x...",
        },
      ],
    };
  }
}

export default X402SetupClient;
