/**
 * @plasma-pay/agent
 * 
 * One-click payment SDK for AI agents on Plasma
 * The cheapest way to pay for APIs - ~$0.0001 per transaction
 * 
 * @example
 * ```typescript
 * import { PlasmaPayClient } from '@plasma-pay/agent';
 * 
 * const client = new PlasmaPayClient({
 *   privateKey: process.env.PLASMA_WALLET_KEY,
 * });
 * 
 * // Automatic payment on 402 responses
 * const response = await client.fetch('https://api.example.com/data');
 * const data = await response.json();
 * ```
 */

// Main client
export { PlasmaPayClient } from './client';

// Signer utilities
export { 
  PlasmaSigner, 
  generateNonce,
  buildTransferWithAuthTypedData,
  buildReceiveWithAuthTypedData,
  parseSignature,
} from './signer';

// Chain definitions
export { 
  plasma, 
  SUPPORTED_CHAINS, 
  USDT0_ADDRESSES,
  getChainName,
  isChainSupported,
} from './chains';

// Types
export type {
  PlasmaPayConfig,
  PlasmaWallet,
  PaymentRequired,
  PaymentOption,
  PaymentSubmitted,
  PaymentReceipt,
  PaymentScheme,
  EIP3009Authorization,
  RouterAuthorization,
  BalanceInfo,
  GasEstimate,
  PlasmaPayEvent,
  PlasmaPayEventHandler,
  EIP712TypedData,
  EIP712Domain,
  EIP712Type,
} from './types';

export {
  PlasmaPayError,
  PLASMA_CHAIN_ID,
  PLASMA_RPC_URL,
  USDT0_ADDRESS,
  USDT0_DECIMALS,
  XPL_DECIMALS,
  PLASMA_CAIP2,
  BASE_CAIP2,
  ETHEREUM_CAIP2,
} from './types';

// Version
export const VERSION = '1.0.0';
