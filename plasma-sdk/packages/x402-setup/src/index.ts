/**
 * @plasma-pay/x402-setup
 * 
 * Easy X402 payment setup tools for websites and agents
 * 
 * @example
 * ```typescript
 * import { X402SetupClient } from '@plasma-pay/x402-setup';
 * 
 * const setup = new X402SetupClient({
 *   paymentAddress: '0x...',
 * });
 * 
 * // Generate setup guide for your framework
 * const guide = setup.generateSetupGuide('nextjs');
 * 
 * // Or set up a new agent with wallet generation
 * const agent = setup.setupAgent({
 *   agentName: 'my-agent',
 *   services: [{ path: '/api/data', price: '1.00', description: 'Premium data' }],
 * });
 * ```
 */

export { X402SetupClient, default } from './client';
export * from './types';

// Re-export convenience functions
export { createX402Middleware } from './middleware';
export { verifyPayment } from './verify';
