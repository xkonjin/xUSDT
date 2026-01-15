/**
 * Subscription Cancellation Email Templates
 * 
 * SUB-004: Implement subscription cancellation via email
 * - Generate professional cancellation emails based on service type
 * - Track cancellation attempts in database
 * - Provide support email lookup for known services
 */

import type { Subscription, SubscriptionCategory } from '@/types';

// ============================================
// Simple API Types (matching specification)
// ============================================

interface CancellationTemplate {
  subject: string;
  body: string;
}

const TEMPLATES: Record<string, CancellationTemplate> = {
  netflix: {
    subject: "Cancel My Netflix Subscription",
    body: `Dear Netflix Support,

I am writing to request the cancellation of my Netflix subscription effective immediately.

Account Email: {email}

Please confirm the cancellation and any final billing details.

Thank you for your assistance.

Best regards`,
  },
  spotify: {
    subject: "Cancel My Spotify Premium Subscription",
    body: `Hello Spotify Support,

I would like to cancel my Spotify Premium subscription.

Account Email: {email}

Please process this cancellation request and confirm when complete.

Thank you.`,
  },
  default: {
    subject: "Subscription Cancellation Request",
    body: `Dear Customer Support,

I am writing to request the cancellation of my subscription to {service}.

Account Email: {email}

Please process this cancellation and confirm when complete.

Thank you for your assistance.

Best regards`,
  },
};

/**
 * Generate a cancellation email template (simple API matching specification)
 */
export function generateCancellationEmail(
  service: string,
  userEmail: string
): CancellationTemplate {
  const normalizedService = service.toLowerCase().replace(/\s+/g, "");
  const template = TEMPLATES[normalizedService] || TEMPLATES.default;

  return {
    subject: template.subject.replace("{service}", service),
    body: template.body
      .replace("{email}", userEmail)
      .replace("{service}", service),
  };
}

/**
 * Get service support email (simple API matching specification)
 */
export function getServiceEmail(service: string): string | null {
  const emails: Record<string, string> = {
    netflix: "help@netflix.com",
    spotify: "support@spotify.com",
    hulu: "support@hulu.com",
    disney: "help@disneyplus.com",
    amazon: "cs-reply@amazon.com",
    apple: "support@apple.com",
  };

  const normalized = service.toLowerCase().replace(/\s+/g, "");
  return emails[normalized] || null;
}

// ============================================
// Types
// ============================================

export interface CancellationEmailTemplate {
  to: string;
  subject: string;
  body: string;
}

export type CancellationStatus = 'pending' | 'copied' | 'email_sent' | 'confirmed';

export interface CancellationAttempt {
  id: string;
  subscriptionId: string;
  subscriptionName: string;
  walletAddress: string;
  status: CancellationStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Known Service Support Emails
// ============================================

const KNOWN_SUPPORT_EMAILS: Record<string, string> = {
  'netflix.com': 'help@netflix.com',
  'spotify.com': 'support@spotify.com',
  'hulu.com': 'support@hulu.com',
  'disneyplus.com': 'help@disneyplus.com',
  'amazon.com': 'cs-help@amazon.com',
  'apple.com': 'support@apple.com',
  'adobe.com': 'support@adobe.com',
  'microsoft.com': 'support@microsoft.com',
  'google.com': 'support@google.com',
  'dropbox.com': 'support@dropbox.com',
  'notion.so': 'team@notion.so',
  'slack.com': 'feedback@slack.com',
  'github.com': 'support@github.com',
  'linkedin.com': 'linkedin-support@linkedin.com',
  'nytimes.com': 'customercare@nytimes.com',
  'wsj.com': 'support@wsj.com',
  'medium.com': 'yourfriends@medium.com',
  'peloton.com': 'support@onepeloton.com',
  'strava.com': 'support@strava.com',
  'headspace.com': 'help@headspace.com',
  'calm.com': 'support@calm.com',
  'doordash.com': 'support@doordash.com',
  'ubereats.com': 'support@uber.com',
  'grubhub.com': 'help@grubhub.com',
  'instacart.com': 'help@instacart.com',
  'coursera.org': 'learner-help@coursera.org',
  'skillshare.com': 'help@skillshare.com',
  'playstation.com': 'support@playstation.com',
  'xbox.com': 'support@xbox.com',
  'nintendo.com': 'support@nintendo.com',
};

// ============================================
// Email Template Generation
// ============================================

/**
 * Get the support email for a given service domain
 */
export function getCancellationSupportEmail(domain: string): string {
  // Normalize domain (remove subdomain, lowercase)
  const normalizedDomain = domain.toLowerCase();
  
  // Check for exact match first
  if (KNOWN_SUPPORT_EMAILS[normalizedDomain]) {
    return KNOWN_SUPPORT_EMAILS[normalizedDomain];
  }
  
  // Check if the domain contains a known service
  for (const [knownDomain, email] of Object.entries(KNOWN_SUPPORT_EMAILS)) {
    if (normalizedDomain.includes(knownDomain.split('.')[0])) {
      return email;
    }
  }
  
  // Default: construct support email from domain
  return `support@${normalizedDomain}`;
}

/**
 * Generate a professional cancellation email template based on subscription type
 */
export async function generateCancellationEmailTemplate(
  subscription: Subscription
): Promise<CancellationEmailTemplate> {
  const supportEmail = subscription.email || getCancellationSupportEmail(subscription.sender);
  
  const subject = `Subscription Cancellation Request - ${subscription.name}`;
  
  const body = generateEmailBody(subscription);
  
  return {
    to: subscription.email || supportEmail,
    subject,
    body,
  };
}

/**
 * Generate email body based on subscription category and details
 */
function generateEmailBody(subscription: Subscription): string {
  const greeting = `Dear ${subscription.name} Support Team,`;
  
  const costInfo = subscription.estimatedCost > 0 
    ? ` (currently ${formatCost(subscription.estimatedCost, subscription.frequency)})`
    : '';
  
  const categorySpecificReason = getCategorySpecificClosing(subscription.category);
  
  const body = `${greeting}

I am writing to request the immediate cancellation of my ${subscription.name} subscription${costInfo}.

Please process this cancellation request and confirm via email that my subscription has been cancelled and that I will not be charged for any future billing periods.

If you need any additional account information to process this request, please let me know.

${categorySpecificReason}

Thank you for your assistance with this matter.

Best regards`;

  return body;
}

/**
 * Format cost with frequency
 */
function formatCost(cost: number, frequency: Subscription['frequency']): string {
  const formattedCost = `$${cost.toFixed(2)}`;
  
  switch (frequency) {
    case 'weekly':
      return `${formattedCost} per week`;
    case 'monthly':
      return `${formattedCost} per month`;
    case 'yearly':
      return `${formattedCost} per year`;
    default:
      return formattedCost;
  }
}

/**
 * Get category-specific closing remarks
 */
function getCategorySpecificClosing(category: SubscriptionCategory): string {
  switch (category) {
    case 'streaming':
      return 'I have enjoyed the content but will not be continuing my membership at this time.';
    case 'software':
      return 'I appreciate the service but no longer require access to this software.';
    case 'fitness':
      return 'Thank you for the motivation, but I will be pursuing other fitness options.';
    case 'gaming':
      return 'I have enjoyed the gaming experience but will be taking a break.';
    case 'news':
      return 'I appreciate the quality journalism but will be exploring other news sources.';
    case 'education':
      return 'Thank you for the learning opportunities, but I will be pursuing other educational resources.';
    case 'food':
      return 'I have appreciated the convenience but will be making other arrangements.';
    case 'shopping':
      return 'I have valued the membership benefits but will be discontinuing at this time.';
    default:
      return 'I appreciate the service you have provided.';
  }
}

// ============================================
// Cancellation Tracking (In-Memory for now)
// ============================================

// In-memory store for cancellation attempts (will be replaced with DB in production)
const cancellationAttempts: Map<string, CancellationAttempt> = new Map();

/**
 * Generate a unique key for cancellation tracking
 */
function getCancellationKey(walletAddress: string, subscriptionId: string): string {
  return `${walletAddress.toLowerCase()}-${subscriptionId}`;
}

/**
 * Validate Ethereum wallet address format
 */
function isValidWalletAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Track a cancellation attempt
 */
export async function trackCancellationAttempt(
  walletAddress: string,
  subscription: Subscription,
  status: CancellationStatus
): Promise<CancellationAttempt> {
  if (!isValidWalletAddress(walletAddress)) {
    throw new Error('Invalid wallet address format');
  }
  
  const key = getCancellationKey(walletAddress, subscription.id);
  const now = new Date();
  
  const existingAttempt = cancellationAttempts.get(key);
  
  const attempt: CancellationAttempt = {
    id: existingAttempt?.id || `cancel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    subscriptionId: subscription.id,
    subscriptionName: subscription.name,
    walletAddress: walletAddress.toLowerCase(),
    status,
    createdAt: existingAttempt?.createdAt || now,
    updatedAt: now,
  };
  
  cancellationAttempts.set(key, attempt);
  
  return attempt;
}

/**
 * Get cancellation status for a subscription
 */
export async function getCancellationStatus(
  walletAddress: string,
  subscriptionId: string
): Promise<CancellationAttempt | null> {
  const key = getCancellationKey(walletAddress, subscriptionId);
  return cancellationAttempts.get(key) || null;
}

/**
 * Get all cancellation attempts for a wallet
 */
export async function getCancellationAttempts(
  walletAddress: string
): Promise<CancellationAttempt[]> {
  const normalizedAddress = walletAddress.toLowerCase();
  const attempts: CancellationAttempt[] = [];
  
  for (const attempt of cancellationAttempts.values()) {
    if (attempt.walletAddress === normalizedAddress) {
      attempts.push(attempt);
    }
  }
  
  return attempts.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}
