/**
 * @plasma-pay/facilitator
 * 
 * X402 FacilitatorEvmSigner implementation for Plasma chain with USDT0 support.
 * 
 * @example
 * ```typescript
 * // Server-side: Create facilitator and middleware
 * import { PlasmaFacilitator, createX402Middleware } from '@plasma-pay/facilitator';
 * 
 * const facilitator = new PlasmaFacilitator({
 *   privateKey: process.env.FACILITATOR_PRIVATE_KEY,
 * });
 * 
 * app.use('/api', createX402Middleware({
 *   facilitator,
 *   pricePerRequest: 1000000n, // 1 USDT0
 *   recipientAddress: '0x...',
 * }));
 * 
 * // Client-side: Sign authorizations
 * import { AuthorizationSigner } from '@plasma-pay/facilitator';
 * 
 * const signer = new AuthorizationSigner({
 *   privateKey: process.env.WALLET_PRIVATE_KEY,
 * });
 * 
 * const header = await signer.createPaymentHeader({
 *   to: '0x...',
 *   value: 1000000n,
 * });
 * 
 * fetch('/api/resource', {
 *   headers: { 'X-Payment': header },
 * });
 * ```
 */

// Core Facilitator
export { PlasmaFacilitator } from './facilitator';

// Authorization Signer
export {
  AuthorizationSigner,
  parseSignature,
  combineSignature,
  generateNonce,
  getCurrentTimestamp,
  calculateValidityWindow,
} from './signer';

// Express Middleware
export {
  createX402Middleware,
  create402Response,
  parseX402Header,
  type X402MiddlewareConfig,
  type X402Request,
} from './middleware';

// Types
export {
  // Core types
  type Hex,
  type Address,
  type TransactionHash,
  type Signature,
  
  // Chain config
  type PlasmaChainConfig,
  PLASMA_MAINNET,
  
  // EIP-3009 types
  type TransferWithAuthorizationParams,
  type SignedAuthorization,
  
  // EIP-712 types
  type EIP712Domain,
  type EIP712TypeDefinition,
  type EIP712Types,
  
  // FacilitatorEvmSigner interface
  type FacilitatorEvmSigner,
  type GetCodeArgs,
  type ReadContractArgs,
  type VerifyTypedDataArgs,
  type WriteContractArgs,
  type SendTransactionArgs,
  type WaitForTransactionReceiptArgs,
  type TransactionReceiptResult,
  
  // Configuration
  type PlasmaFacilitatorConfig,
  
  // X402 types
  type X402Scheme,
  type X402PaymentPayload,
  type X402PaymentHeader,
  type X402PaymentResult,
  
  // ABI and type hashes
  USDT0_ABI,
  TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
  RECEIVE_WITH_AUTHORIZATION_TYPEHASH,
  CANCEL_AUTHORIZATION_TYPEHASH,
} from './types';
