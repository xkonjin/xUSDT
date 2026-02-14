/**
 * Agent Helper Types - Agent-to-agent onboarding and assistance
 */

import type { Address } from 'viem';

export interface AgentProfile {
  /** Agent's name/identifier */
  name: string;
  /** Agent's wallet address */
  walletAddress: Address;
  /** Services the agent provides */
  services: AgentService[];
  /** Agent's capabilities */
  capabilities: AgentCapability[];
  /** Whether the agent is set up for payments */
  paymentsEnabled: boolean;
  /** Current USDT0 balance */
  balance?: string;
  /** ZKP2P funding link */
  fundingLink?: string;
}

export interface AgentService {
  /** Service name */
  name: string;
  /** Service endpoint */
  endpoint: string;
  /** Price per request in USDT0 */
  price: string;
  /** Description */
  description: string;
  /** Example request */
  exampleRequest?: string;
  /** Example response */
  exampleResponse?: string;
}

export type AgentCapability = 
  | 'payments'
  | 'defi'
  | 'trading'
  | 'research'
  | 'coding'
  | 'data'
  | 'image'
  | 'voice'
  | 'custom';

export interface OnboardingRequest {
  /** Name for the new agent */
  agentName: string;
  /** Services the agent will provide */
  services: Omit<AgentService, 'endpoint'>[];
  /** Desired capabilities */
  capabilities: AgentCapability[];
  /** Framework being used */
  framework?: string;
  /** Whether to generate a new wallet */
  generateWallet?: boolean;
  /** Existing wallet address (if not generating) */
  existingWallet?: Address;
}

export interface OnboardingResult {
  /** Success status */
  success: boolean;
  /** Generated agent profile */
  profile: AgentProfile;
  /** Setup instructions */
  instructions: OnboardingInstruction[];
  /** Code snippets to implement */
  codeSnippets: CodeSnippet[];
  /** Environment variables to set */
  envVars: Record<string, string>;
  /** Next steps */
  nextSteps: string[];
  /** Errors if any */
  errors?: string[];
}

export interface OnboardingInstruction {
  /** Step number */
  step: number;
  /** Title */
  title: string;
  /** Detailed description */
  description: string;
  /** Command to run (if applicable) */
  command?: string;
  /** Whether this step is optional */
  optional?: boolean;
}

export interface CodeSnippet {
  /** Filename */
  filename: string;
  /** Programming language */
  language: string;
  /** The code */
  code: string;
  /** Description of what this code does */
  description: string;
}

export interface AgentDiscovery {
  /** Known agents in the network */
  agents: AgentProfile[];
  /** Total number of agents */
  totalAgents: number;
  /** Categories of services available */
  categories: string[];
}

export interface PaymentAssistance {
  /** Type of assistance needed */
  type: 'setup' | 'funding' | 'sending' | 'receiving' | 'troubleshooting';
  /** Detailed guidance */
  guidance: string[];
  /** Relevant code examples */
  examples: CodeSnippet[];
  /** Links to documentation */
  docs: string[];
}

export interface ConversationalContext {
  /** Current topic */
  topic: 'onboarding' | 'payments' | 'defi' | 'troubleshooting' | 'general';
  /** Previous messages */
  history: ConversationMessage[];
  /** Current agent profile (if known) */
  agentProfile?: AgentProfile;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
