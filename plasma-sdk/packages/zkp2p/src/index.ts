/**
 * @plasma-pay/zkp2p
 * 
 * ZKP2P fiat on-ramp integration for Plasma Pay
 * 
 * @example
 * ```typescript
 * import { ZKP2PClient } from '@plasma-pay/zkp2p';
 * 
 * const zkp2p = new ZKP2PClient();
 * 
 * // Create on-ramp request
 * const { url } = await zkp2p.createOnrampRequest({
 *   amount: '100',
 *   recipient: '0x...',
 *   platform: 'venmo',
 * });
 * 
 * // Share URL with user
 * console.log('Complete payment at:', url);
 * ```
 */

export { ZKP2PClient, default } from './client';
export * from './types';
