/**
 * @plasma-pay/agent-helper
 * 
 * Agent-to-agent payment setup assistance
 * Helps agents onboard other agents to Plasma payments
 * 
 * @example
 * ```typescript
 * import { AgentHelperClient } from '@plasma-pay/agent-helper';
 * 
 * const helper = new AgentHelperClient();
 * 
 * // Onboard a new agent
 * const result = await helper.onboardAgent({
 *   agentName: 'my-agent',
 *   services: [{ name: 'Data API', price: '1.00', description: 'Premium data' }],
 *   capabilities: ['payments', 'data'],
 *   generateWallet: true,
 * });
 * 
 * console.log('Wallet:', result.profile.walletAddress);
 * console.log('Funding link:', result.profile.fundingLink);
 * ```
 */

export { AgentHelperClient, default } from './client';
export * from './types';
