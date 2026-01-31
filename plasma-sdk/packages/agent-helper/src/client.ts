/**
 * Agent Helper Client - Helps agents onboard other agents to Plasma payments
 * 
 * This module enables agents to assist other agents in:
 * - Setting up wallets and payment infrastructure
 * - Funding their accounts via ZKP2P
 * - Configuring X402 payment endpoints
 * - Understanding DeFi opportunities
 */

import { X402SetupClient } from '@plasma-pay/x402-setup';
import { ZKP2PClient } from '@plasma-pay/zkp2p';
import type { Address, Hex } from 'viem';
import type {
  AgentProfile,
  AgentService,
  AgentCapability,
  OnboardingRequest,
  OnboardingResult,
  OnboardingInstruction,
  CodeSnippet,
  PaymentAssistance,
  ConversationalContext,
} from './types';

export class AgentHelperClient {
  private x402Setup: X402SetupClient;
  private zkp2p: ZKP2PClient;

  constructor() {
    this.x402Setup = new X402SetupClient({ paymentAddress: '0x0' as Address });
    this.zkp2p = new ZKP2PClient();
  }

  /**
   * Onboard a new agent to Plasma payments
   */
  async onboardAgent(request: OnboardingRequest): Promise<OnboardingResult> {
    const errors: string[] = [];
    
    // Generate or use existing wallet
    let walletAddress: Address;
    let privateKey: Hex | undefined;
    let mnemonic: string | undefined;

    if (request.generateWallet || !request.existingWallet) {
      const wallet = this.x402Setup.generateAgentWallet();
      walletAddress = wallet.address;
      privateKey = wallet.privateKey;
      mnemonic = wallet.mnemonic;
    } else {
      walletAddress = request.existingWallet;
    }

    // Create agent profile
    const profile: AgentProfile = {
      name: request.agentName,
      walletAddress,
      services: request.services.map((s, i) => ({
        ...s,
        endpoint: `/api/${s.name.toLowerCase().replace(/\s+/g, '-')}`,
      })),
      capabilities: request.capabilities,
      paymentsEnabled: true,
      fundingLink: this.zkp2p.createAgentFundingLink(walletAddress, {
        agentName: request.agentName,
        suggestedAmount: '100',
      }),
    };

    // Generate setup instructions
    const instructions = this.generateInstructions(request, profile);

    // Generate code snippets
    const codeSnippets = this.generateCodeSnippets(request, profile);

    // Generate environment variables
    const envVars: Record<string, string> = {
      PLASMA_WALLET_ADDRESS: walletAddress,
      PLASMA_AGENT_NAME: request.agentName,
    };

    if (privateKey) {
      envVars.PLASMA_PRIVATE_KEY = privateKey;
    }

    // Generate next steps
    const nextSteps = [
      `Fund your agent wallet at: ${profile.fundingLink}`,
      'Add the environment variables to your .env file',
      'Implement the X402 middleware in your API',
      'Test a payment flow end-to-end',
      'Register your agent in the Plasma agent directory (coming soon)',
    ];

    return {
      success: errors.length === 0,
      profile,
      instructions,
      codeSnippets,
      envVars,
      nextSteps,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Get payment assistance for common scenarios
   */
  getPaymentAssistance(type: PaymentAssistance['type']): PaymentAssistance {
    const assistanceMap: Record<PaymentAssistance['type'], PaymentAssistance> = {
      setup: {
        type: 'setup',
        guidance: [
          'To set up payments, you need a wallet address to receive funds.',
          'Install the Plasma Pay SDK: npm install @plasma-pay/agent',
          'Generate a wallet or import an existing one.',
          'Add X402 middleware to your API endpoints.',
          'Set your pricing for each service.',
        ],
        examples: this.getSetupExamples(),
        docs: [
          'https://docs.plasma.xyz/payments/setup',
          'https://docs.plasma.xyz/x402/middleware',
        ],
      },
      funding: {
        type: 'funding',
        guidance: [
          'You can fund your agent wallet using ZKP2P.',
          'ZKP2P lets you convert fiat (Venmo, Zelle, etc.) to USDT0.',
          'Generate a funding link and share it with users.',
          'Alternatively, bridge crypto from other chains using LiFi.',
        ],
        examples: this.getFundingExamples(),
        docs: [
          'https://docs.plasma.xyz/funding/zkp2p',
          'https://docs.plasma.xyz/funding/lifi',
        ],
      },
      sending: {
        type: 'sending',
        guidance: [
          'Use the PlasmaPayClient to send payments.',
          'Payments on Plasma are gasless using EIP-3009.',
          'You can send to any address on Plasma or bridge to other chains.',
          'Prefer Plasma for lowest fees (~$0.0001 per transaction).',
        ],
        examples: this.getSendingExamples(),
        docs: [
          'https://docs.plasma.xyz/payments/sending',
          'https://docs.plasma.xyz/payments/cross-chain',
        ],
      },
      receiving: {
        type: 'receiving',
        guidance: [
          'Set up X402 middleware to accept payments.',
          'When a request comes without payment, return 402 with payment details.',
          'Verify payment proofs before providing service.',
          'Use webhooks to track successful payments.',
        ],
        examples: this.getReceivingExamples(),
        docs: [
          'https://docs.plasma.xyz/payments/receiving',
          'https://docs.plasma.xyz/x402/verification',
        ],
      },
      troubleshooting: {
        type: 'troubleshooting',
        guidance: [
          'Common issues and solutions:',
          '1. "Insufficient balance" - Fund your wallet via ZKP2P or bridge',
          '2. "Invalid signature" - Check that the payment proof is correctly formatted',
          '3. "Payment expired" - The authorization deadline has passed, request a new one',
          '4. "Wrong network" - Ensure you\'re on Plasma (chain ID 98866)',
        ],
        examples: [],
        docs: [
          'https://docs.plasma.xyz/troubleshooting',
          'https://docs.plasma.xyz/faq',
        ],
      },
    };

    return assistanceMap[type];
  }

  /**
   * Generate a conversational response for agent onboarding
   */
  generateOnboardingResponse(context: ConversationalContext, userMessage: string): string {
    const lowerMessage = userMessage.toLowerCase();

    // Detect intent
    if (lowerMessage.includes('set up') || lowerMessage.includes('setup') || lowerMessage.includes('start')) {
      return this.getSetupResponse();
    }

    if (lowerMessage.includes('fund') || lowerMessage.includes('money') || lowerMessage.includes('deposit')) {
      return this.getFundingResponse();
    }

    if (lowerMessage.includes('send') || lowerMessage.includes('pay') || lowerMessage.includes('transfer')) {
      return this.getSendingResponse();
    }

    if (lowerMessage.includes('receive') || lowerMessage.includes('accept') || lowerMessage.includes('charge')) {
      return this.getReceivingResponse();
    }

    if (lowerMessage.includes('help') || lowerMessage.includes('error') || lowerMessage.includes('problem')) {
      return this.getTroubleshootingResponse();
    }

    // Default response
    return this.getDefaultResponse();
  }

  /**
   * Check if an agent is properly set up for payments
   */
  async checkAgentSetup(walletAddress: Address): Promise<{
    isSetUp: boolean;
    hasBalance: boolean;
    balance: string;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // In production, this would check on-chain
    const balance = '0'; // Would fetch actual balance
    const hasBalance = parseFloat(balance) > 0;

    if (!hasBalance) {
      issues.push('Wallet has no USDT0 balance');
      recommendations.push('Fund your wallet using ZKP2P or bridge from another chain');
    }

    return {
      isSetUp: issues.length === 0,
      hasBalance,
      balance,
      issues,
      recommendations,
    };
  }

  // ============================================================================
  // Private Methods - Generate Instructions
  // ============================================================================

  private generateInstructions(request: OnboardingRequest, profile: AgentProfile): OnboardingInstruction[] {
    return [
      {
        step: 1,
        title: 'Install Plasma Pay SDK',
        description: 'Add the Plasma Pay packages to your project',
        command: 'npm install @plasma-pay/agent @plasma-pay/x402-setup',
      },
      {
        step: 2,
        title: 'Configure Environment Variables',
        description: 'Add your wallet address and private key to your environment',
        command: `echo "PLASMA_WALLET_ADDRESS=${profile.walletAddress}" >> .env`,
      },
      {
        step: 3,
        title: 'Add X402 Middleware',
        description: 'Implement payment verification in your API',
      },
      {
        step: 4,
        title: 'Fund Your Wallet',
        description: `Visit your funding link to add USDT0: ${profile.fundingLink}`,
      },
      {
        step: 5,
        title: 'Test Payment Flow',
        description: 'Make a test payment to verify everything works',
        optional: true,
      },
    ];
  }

  private generateCodeSnippets(request: OnboardingRequest, profile: AgentProfile): CodeSnippet[] {
    const snippets: CodeSnippet[] = [];

    // Main setup snippet
    snippets.push({
      filename: 'plasma-setup.ts',
      language: 'typescript',
      description: 'Initialize Plasma Pay client',
      code: `
import { PlasmaPayClient } from '@plasma-pay/agent';
import { createX402Middleware } from '@plasma-pay/x402-setup';

// Initialize client
const plasmaClient = new PlasmaPayClient({
  privateKey: process.env.PLASMA_PRIVATE_KEY,
});

// Create X402 middleware
const x402 = createX402Middleware({
  paymentAddress: process.env.PLASMA_WALLET_ADDRESS,
  network: 'plasma',
  services: [
${profile.services.map(s => `    { path: '${s.endpoint}', price: '${s.price}', description: '${s.description}' },`).join('\n')}
  ],
});

export { plasmaClient, x402 };
`.trim(),
    });

    // API route example
    snippets.push({
      filename: 'api-route.ts',
      language: 'typescript',
      description: 'Example paid API endpoint',
      code: `
import { x402 } from './plasma-setup';

// Express example
app.get('${profile.services[0]?.endpoint || '/api/service'}', 
  x402.requirePayment('${profile.services[0]?.price || '1.00'}'),
  (req, res) => {
    // Payment verified! Provide service
    res.json({ 
      success: true, 
      data: 'Your premium content here',
      payment: req.payment,
    });
  }
);
`.trim(),
    });

    return snippets;
  }

  // ============================================================================
  // Private Methods - Example Code
  // ============================================================================

  private getSetupExamples(): CodeSnippet[] {
    return [{
      filename: 'setup.ts',
      language: 'typescript',
      description: 'Basic setup',
      code: `
import { PlasmaPayClient } from '@plasma-pay/agent';

const client = new PlasmaPayClient({
  privateKey: process.env.PLASMA_PRIVATE_KEY,
});

// Check balance
const balance = await client.getBalance();
console.log('Balance:', balance);
`.trim(),
    }];
  }

  private getFundingExamples(): CodeSnippet[] {
    return [{
      filename: 'funding.ts',
      language: 'typescript',
      description: 'Generate funding link',
      code: `
import { ZKP2PClient } from '@plasma-pay/zkp2p';

const zkp2p = new ZKP2PClient();

// Create funding link
const fundingLink = zkp2p.createAgentFundingLink(
  process.env.PLASMA_WALLET_ADDRESS,
  { suggestedAmount: '100', agentName: 'My Agent' }
);

console.log('Fund your agent at:', fundingLink);
`.trim(),
    }];
  }

  private getSendingExamples(): CodeSnippet[] {
    return [{
      filename: 'send.ts',
      language: 'typescript',
      description: 'Send payment',
      code: `
import { PlasmaPayClient } from '@plasma-pay/agent';

const client = new PlasmaPayClient({
  privateKey: process.env.PLASMA_PRIVATE_KEY,
});

// Send payment
const result = await client.sendPayment({
  to: '0x...',
  amount: '10.00',
  note: 'Payment for service',
});

console.log('Transaction:', result.txHash);
`.trim(),
    }];
  }

  private getReceivingExamples(): CodeSnippet[] {
    return [{
      filename: 'receive.ts',
      language: 'typescript',
      description: 'Accept payments',
      code: `
import { createX402Middleware } from '@plasma-pay/x402-setup';

const x402 = createX402Middleware({
  paymentAddress: process.env.PLASMA_WALLET_ADDRESS,
});

// Protect endpoint
app.get('/api/premium', x402.requirePayment('5.00'), (req, res) => {
  res.json({ data: 'Premium content' });
});
`.trim(),
    }];
  }

  // ============================================================================
  // Private Methods - Conversational Responses
  // ============================================================================

  private getSetupResponse(): string {
    return `Great! Let me help you set up Plasma payments for your agent.

**Step 1: Install the SDK**
\`\`\`bash
npm install @plasma-pay/agent @plasma-pay/x402-setup
\`\`\`

**Step 2: Generate a wallet**
\`\`\`typescript
import { X402SetupClient } from '@plasma-pay/x402-setup';

const setup = new X402SetupClient({ paymentAddress: '0x0' });
const wallet = setup.generateAgentWallet();

console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);
// IMPORTANT: Save these securely!
\`\`\`

**Step 3: Add to your .env**
\`\`\`
PLASMA_WALLET_ADDRESS=<your address>
PLASMA_PRIVATE_KEY=<your private key>
\`\`\`

Would you like me to help you with the next steps?`;
  }

  private getFundingResponse(): string {
    return `To fund your agent wallet, you have several options:

**Option 1: ZKP2P (Fiat to Crypto)**
Use Venmo, Zelle, Revolut, or other payment apps:
\`\`\`typescript
import { ZKP2PClient } from '@plasma-pay/zkp2p';

const zkp2p = new ZKP2PClient();
const link = zkp2p.createAgentFundingLink(process.env.PLASMA_WALLET_ADDRESS);
console.log('Fund at:', link);
\`\`\`

**Option 2: Bridge from Another Chain**
Use LiFi to bridge from Ethereum, Base, etc.:
\`\`\`typescript
import { PlasmaLiFiClient } from '@plasma-pay/lifi';

const lifi = new PlasmaLiFiClient({ privateKey: '...' });
await lifi.swap({
  fromChainId: 1, // Ethereum
  fromToken: '0x...', // USDC
  fromAmount: '100000000', // 100 USDC
  fromAddress: '0x...',
});
\`\`\`

Which method would you prefer?`;
  }

  private getSendingResponse(): string {
    return `Sending payments on Plasma is easy and nearly free (~$0.0001 per transaction).

**Send to Plasma Address:**
\`\`\`typescript
import { PlasmaPayClient } from '@plasma-pay/agent';

const client = new PlasmaPayClient({ privateKey: process.env.PLASMA_PRIVATE_KEY });

const result = await client.sendPayment({
  to: '0x...',
  amount: '10.00',
});
\`\`\`

**Send to Other Chains (via LiFi):**
\`\`\`typescript
import { PlasmaLiFiClient } from '@plasma-pay/lifi';

const lifi = new PlasmaLiFiClient({ privateKey: '...' });
await lifi.send({
  to: '0x...',
  amount: '10000000', // 10 USDT0
  toChainId: 8453, // Base
});
\`\`\`

The SDK automatically prefers Plasma for lowest fees. Need help with anything specific?`;
  }

  private getReceivingResponse(): string {
    return `To accept payments, add X402 middleware to your API:

**Express/Node.js:**
\`\`\`typescript
import { createX402Middleware } from '@plasma-pay/x402-setup';

const x402 = createX402Middleware({
  paymentAddress: process.env.PLASMA_WALLET_ADDRESS,
});

// Protect your endpoint
app.get('/api/premium', x402.requirePayment('1.00'), (req, res) => {
  // Payment verified! req.payment contains details
  res.json({ data: 'Premium content' });
});
\`\`\`

When clients call without payment, they'll get a 402 response with payment instructions. The SDK handles verification automatically.

Want me to show you how to set up webhooks for payment notifications?`;
  }

  private getTroubleshootingResponse(): string {
    return `Let me help you troubleshoot. Here are common issues:

**"Insufficient balance"**
- Fund your wallet via ZKP2P or bridge from another chain
- Check balance: \`await client.getBalance()\`

**"Invalid signature"**
- Ensure payment proof is base64 or JSON encoded
- Check that the signature matches the sender address

**"Payment expired"**
- Authorization deadlines are typically 1 hour
- Request a new payment authorization

**"Wrong network"**
- Plasma chain ID is 98866
- Ensure your RPC is pointing to Plasma

What specific issue are you experiencing?`;
  }

  private getDefaultResponse(): string {
    return `I'm here to help you with Plasma payments! I can assist with:

1. **Setting up** - Generate wallets, configure middleware
2. **Funding** - Add USDT0 via ZKP2P or bridge
3. **Sending** - Transfer to any address on any chain
4. **Receiving** - Accept payments with X402
5. **Troubleshooting** - Fix common issues

What would you like help with?`;
  }
}

export default AgentHelperClient;
