/**
 * X402 Setup Types - Easy payment integration for websites and agents
 */

import type { Address, Hex } from 'viem';

export interface X402Config {
  /** Wallet address to receive payments */
  paymentAddress: Address;
  /** Network to accept payments on (default: plasma) */
  network?: 'plasma' | 'base' | 'ethereum';
  /** Token to accept (default: USDT0) */
  token?: Address;
  /** Whether to use a facilitator for gas sponsorship */
  useFacilitator?: boolean;
  /** Facilitator URL if using one */
  facilitatorUrl?: string;
  /** Webhook URL for payment notifications */
  webhookUrl?: string;
  /** Secret for webhook verification */
  webhookSecret?: string;
}

export interface PaywallConfig {
  /** Price in token units (e.g., "1.00" for $1) */
  price: string;
  /** Description of what's being paid for */
  description?: string;
  /** Expiry time for the payment authorization (seconds) */
  expirySeconds?: number;
  /** Custom metadata to include */
  metadata?: Record<string, string>;
}

export interface X402Headers {
  'X-Payment-Required': 'true';
  'X-Payment-Address': string;
  'X-Payment-Amount': string;
  'X-Payment-Token': string;
  'X-Payment-Network': string;
  'X-Payment-Description'?: string;
  'X-Payment-Expiry'?: string;
}

export interface PaymentProof {
  /** EIP-3009 authorization signature */
  signature: Hex;
  /** Sender address */
  from: Address;
  /** Recipient address */
  to: Address;
  /** Amount in atomic units */
  value: string;
  /** Nonce for replay protection */
  nonce: string;
  /** Deadline timestamp */
  deadline: string;
  /** Transaction hash (if already submitted) */
  txHash?: Hex;
}

export interface VerificationResult {
  valid: boolean;
  error?: string;
  payment?: {
    from: Address;
    to: Address;
    amount: string;
    txHash?: Hex;
  };
}

export interface SetupGuide {
  framework: string;
  steps: SetupStep[];
  codeSnippets: CodeSnippet[];
  envVars: EnvVar[];
}

export interface SetupStep {
  order: number;
  title: string;
  description: string;
  command?: string;
}

export interface CodeSnippet {
  filename: string;
  language: string;
  code: string;
  description: string;
}

export interface EnvVar {
  name: string;
  description: string;
  required: boolean;
  example: string;
}

export type Framework = 
  | 'nextjs'
  | 'express'
  | 'fastify'
  | 'hono'
  | 'python-flask'
  | 'python-fastapi'
  | 'vercel-edge'
  | 'cloudflare-workers';

export interface AgentSetupConfig {
  /** Agent name/identifier */
  agentName: string;
  /** Agent's wallet address (will be generated if not provided) */
  walletAddress?: Address;
  /** Private key (will be generated if not provided) */
  privateKey?: Hex;
  /** Services the agent provides */
  services: AgentService[];
  /** Webhook for payment notifications */
  webhookUrl?: string;
}

export interface AgentService {
  /** Service endpoint path */
  path: string;
  /** Price per request */
  price: string;
  /** Description */
  description: string;
  /** Rate limit (requests per minute) */
  rateLimit?: number;
}

export interface AgentSetupResult {
  /** Generated or provided wallet address */
  walletAddress: Address;
  /** Generated or provided private key (KEEP SECRET!) */
  privateKey: Hex;
  /** Mnemonic phrase for recovery (KEEP SECRET!) */
  mnemonic?: string;
  /** X402 middleware configuration */
  middlewareConfig: string;
  /** Environment variables to set */
  envVars: Record<string, string>;
  /** Setup instructions */
  instructions: string[];
}
