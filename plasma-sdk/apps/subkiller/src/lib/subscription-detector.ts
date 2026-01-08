/**
 * Subscription Detection and Analysis
 * 
 * This module provides client-safe subscription detection utilities.
 * Server-side Gmail API calls should be done in API routes only.
 */

import type { GmailMessage, Subscription, SubscriptionCategory } from '@/types';

// ============================================
// Client-Safe Email Parsing Utilities
// ============================================

/**
 * Extract the domain from an email sender string
 * e.g., "Netflix <noreply@netflix.com>" -> "netflix.com"
 */
export function extractSenderDomain(from: string): string {
  const match = from.match(/<([^>]+)>/) || from.match(/([^\s]+@[^\s]+)/);
  if (match) {
    const email = match[1];
    const domain = email.split('@')[1];
    return domain;
  }
  return from;
}

/**
 * Extract the sender name from an email sender string
 * e.g., "Netflix <noreply@netflix.com>" -> "Netflix"
 */
export function extractSenderName(from: string): string {
  const match = from.match(/^([^<]+)</);
  if (match) {
    return match[1].trim().replace(/"/g, '');
  }
  return extractSenderDomain(from).split('.')[0];
}

/**
 * Group emails by sender domain for subscription analysis
 */
export function groupEmailsBySender(messages: GmailMessage[]): Map<string, GmailMessage[]> {
  const groups = new Map<string, GmailMessage[]>();
  
  for (const msg of messages) {
    const domain = extractSenderDomain(msg.from);
    if (!groups.has(domain)) {
      groups.set(domain, []);
    }
    groups.get(domain)!.push(msg);
  }
  
  return groups;
}

// ============================================
// Known Subscription Services Database
// ============================================

// Known subscription services and their typical costs
const KNOWN_SERVICES: Record<string, { 
  name: string; 
  category: SubscriptionCategory; 
  typicalCost: number;
  frequency: 'monthly' | 'yearly';
  logoUrl?: string;
}> = {
  'netflix.com': { name: 'Netflix', category: 'streaming', typicalCost: 15.49, frequency: 'monthly' },
  'spotify.com': { name: 'Spotify', category: 'streaming', typicalCost: 10.99, frequency: 'monthly' },
  'amazon.com': { name: 'Amazon Prime', category: 'shopping', typicalCost: 14.99, frequency: 'monthly' },
  'hulu.com': { name: 'Hulu', category: 'streaming', typicalCost: 17.99, frequency: 'monthly' },
  'disneyplus.com': { name: 'Disney+', category: 'streaming', typicalCost: 13.99, frequency: 'monthly' },
  'hbomax.com': { name: 'Max', category: 'streaming', typicalCost: 15.99, frequency: 'monthly' },
  'apple.com': { name: 'Apple Services', category: 'software', typicalCost: 9.99, frequency: 'monthly' },
  'google.com': { name: 'Google One', category: 'software', typicalCost: 2.99, frequency: 'monthly' },
  'microsoft.com': { name: 'Microsoft 365', category: 'software', typicalCost: 9.99, frequency: 'monthly' },
  'adobe.com': { name: 'Adobe Creative Cloud', category: 'software', typicalCost: 54.99, frequency: 'monthly' },
  'dropbox.com': { name: 'Dropbox', category: 'software', typicalCost: 11.99, frequency: 'monthly' },
  'notion.so': { name: 'Notion', category: 'productivity', typicalCost: 10, frequency: 'monthly' },
  'slack.com': { name: 'Slack', category: 'productivity', typicalCost: 8.75, frequency: 'monthly' },
  'github.com': { name: 'GitHub', category: 'software', typicalCost: 4, frequency: 'monthly' },
  'linkedin.com': { name: 'LinkedIn Premium', category: 'social', typicalCost: 29.99, frequency: 'monthly' },
  'nytimes.com': { name: 'New York Times', category: 'news', typicalCost: 17, frequency: 'monthly' },
  'wsj.com': { name: 'Wall Street Journal', category: 'news', typicalCost: 38.99, frequency: 'monthly' },
  'medium.com': { name: 'Medium', category: 'news', typicalCost: 5, frequency: 'monthly' },
  'substack.com': { name: 'Substack', category: 'news', typicalCost: 5, frequency: 'monthly' },
  'peloton.com': { name: 'Peloton', category: 'fitness', typicalCost: 44, frequency: 'monthly' },
  'strava.com': { name: 'Strava', category: 'fitness', typicalCost: 11.99, frequency: 'monthly' },
  'headspace.com': { name: 'Headspace', category: 'fitness', typicalCost: 12.99, frequency: 'monthly' },
  'calm.com': { name: 'Calm', category: 'fitness', typicalCost: 14.99, frequency: 'monthly' },
  'doordash.com': { name: 'DoorDash', category: 'food', typicalCost: 9.99, frequency: 'monthly' },
  'ubereats.com': { name: 'Uber Eats', category: 'food', typicalCost: 9.99, frequency: 'monthly' },
  'grubhub.com': { name: 'Grubhub+', category: 'food', typicalCost: 9.99, frequency: 'monthly' },
  'instacart.com': { name: 'Instacart+', category: 'food', typicalCost: 9.99, frequency: 'monthly' },
  'coursera.org': { name: 'Coursera', category: 'education', typicalCost: 59, frequency: 'monthly' },
  'udemy.com': { name: 'Udemy', category: 'education', typicalCost: 16.58, frequency: 'monthly' },
  'skillshare.com': { name: 'Skillshare', category: 'education', typicalCost: 13.99, frequency: 'monthly' },
  'masterclass.com': { name: 'MasterClass', category: 'education', typicalCost: 10, frequency: 'monthly' },
  'playstation.com': { name: 'PlayStation Plus', category: 'gaming', typicalCost: 17.99, frequency: 'monthly' },
  'xbox.com': { name: 'Xbox Game Pass', category: 'gaming', typicalCost: 14.99, frequency: 'monthly' },
  'nintendo.com': { name: 'Nintendo Switch Online', category: 'gaming', typicalCost: 3.99, frequency: 'monthly' },
  'ea.com': { name: 'EA Play', category: 'gaming', typicalCost: 4.99, frequency: 'monthly' },
};

export function detectSubscriptions(messages: GmailMessage[]): Partial<Subscription>[] {
  const grouped = groupEmailsBySender(messages);
  const subscriptions: Partial<Subscription>[] = [];

  for (const [domain, emails] of grouped) {
    // Need at least 2 emails to consider it a subscription
    if (emails.length < 2) continue;

    const knownService = KNOWN_SERVICES[domain];
    const sortedEmails = emails.sort((a, b) => b.date.getTime() - a.date.getTime());
    const firstEmail = sortedEmails[sortedEmails.length - 1];
    const lastEmail = sortedEmails[0];

    // Calculate frequency based on email dates
    const frequency = calculateFrequency(sortedEmails);

    // Extract unsubscribe URL from List-Unsubscribe header
    let unsubscribeUrl: string | undefined;
    for (const email of emails) {
      if (email.listUnsubscribe) {
        const urlMatch = email.listUnsubscribe.match(/<(https?:[^>]+)>/);
        if (urlMatch) {
          unsubscribeUrl = urlMatch[1];
          break;
        }
      }
    }

    subscriptions.push({
      id: domain,
      name: knownService?.name || extractSenderName(emails[0].from),
      sender: domain,
      email: extractEmailAddress(emails[0].from),
      estimatedCost: knownService?.typicalCost || 0,
      frequency: knownService?.frequency || frequency,
      category: knownService?.category || 'other',
      lastSeen: lastEmail.date,
      firstSeen: firstEmail.date,
      emailCount: emails.length,
      unsubscribeUrl,
      logoUrl: knownService?.logoUrl,
      status: 'active',
    });
  }

  // Sort by estimated cost (highest first)
  return subscriptions.sort((a, b) => (b.estimatedCost || 0) - (a.estimatedCost || 0));
}

function calculateFrequency(emails: GmailMessage[]): 'monthly' | 'yearly' | 'weekly' | 'unknown' {
  if (emails.length < 2) return 'unknown';

  const intervals: number[] = [];
  for (let i = 1; i < emails.length; i++) {
    const diff = emails[i - 1].date.getTime() - emails[i].date.getTime();
    intervals.push(diff / (1000 * 60 * 60 * 24)); // Convert to days
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

  if (avgInterval <= 10) return 'weekly';
  if (avgInterval <= 45) return 'monthly';
  if (avgInterval <= 400) return 'yearly';
  return 'unknown';
}

function extractEmailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/) || from.match(/([^\s]+@[^\s]+)/);
  return match ? match[1] : from;
}

export function calculateTotals(subscriptions: Partial<Subscription>[]): {
  monthly: number;
  yearly: number;
} {
  let monthly = 0;
  let yearly = 0;

  for (const sub of subscriptions) {
    const cost = sub.estimatedCost || 0;
    switch (sub.frequency) {
      case 'weekly':
        monthly += cost * 4;
        yearly += cost * 52;
        break;
      case 'monthly':
        monthly += cost;
        yearly += cost * 12;
        break;
      case 'yearly':
        monthly += cost / 12;
        yearly += cost;
        break;
      default:
        // Assume monthly for unknown
        monthly += cost;
        yearly += cost * 12;
    }
  }

  return { monthly: Math.round(monthly * 100) / 100, yearly: Math.round(yearly * 100) / 100 };
}
