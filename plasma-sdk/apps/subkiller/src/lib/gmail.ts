/**
 * Gmail API Integration - SERVER-SIDE ONLY
 * 
 * This module uses Node.js-specific googleapis library and should
 * ONLY be imported in API routes (server components), not client components.
 * 
 * For client-safe email parsing utilities, use subscription-detector.ts
 */

import { google } from 'googleapis';
import type { GmailMessage } from '@/types';

const gmail = google.gmail('v1');

// Common subscription sender patterns
const SUBSCRIPTION_PATTERNS = [
  /noreply@/i,
  /no-reply@/i,
  /notifications?@/i,
  /billing@/i,
  /receipts?@/i,
  /subscription@/i,
  /support@/i,
  /newsletter@/i,
  /updates?@/i,
  /team@/i,
  /hello@/i,
  /info@/i,
];

// Keywords that indicate subscription emails
const SUBSCRIPTION_KEYWORDS = [
  'subscription',
  'renewal',
  'billing',
  'payment',
  'invoice',
  'receipt',
  'membership',
  'plan',
  'trial',
  'upgrade',
  'cancel',
  'unsubscribe',
  'account',
  'monthly',
  'annual',
  'yearly',
];

export async function fetchSubscriptionEmails(
  accessToken: string,
  maxResults: number = 500
): Promise<GmailMessage[]> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  // Search for emails that look like subscriptions
  const query = SUBSCRIPTION_KEYWORDS
    .slice(0, 5)
    .map(k => `subject:${k}`)
    .join(' OR ');

  const response = await gmail.users.messages.list({
    auth,
    userId: 'me',
    q: query,
    maxResults,
  });

  const messages: GmailMessage[] = [];
  const messageIds = response.data.messages || [];

  // Fetch message details in batches
  const batchSize = 50;
  for (let i = 0; i < messageIds.length; i += batchSize) {
    const batch = messageIds.slice(i, i + batchSize);
    const details = await Promise.all(
      batch.map(msg =>
        gmail.users.messages.get({
          auth,
          userId: 'me',
          id: msg.id!,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date', 'List-Unsubscribe'],
        })
      )
    );

    for (const detail of details) {
      const headers = detail.data.payload?.headers || [];
      const getHeader = (name: string) =>
        headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

      const from = getHeader('From');
      const subject = getHeader('Subject');
      const date = getHeader('Date');
      const listUnsubscribe = getHeader('List-Unsubscribe');

      // Filter out emails that don't match subscription patterns
      const isSubscription = 
        SUBSCRIPTION_PATTERNS.some(p => p.test(from)) ||
        SUBSCRIPTION_KEYWORDS.some(k => 
          subject.toLowerCase().includes(k) || from.toLowerCase().includes(k)
        );

      if (isSubscription) {
        messages.push({
          id: detail.data.id!,
          threadId: detail.data.threadId!,
          from,
          subject,
          date: new Date(date),
          snippet: detail.data.snippet || '',
          listUnsubscribe: listUnsubscribe || undefined,
        });
      }
    }
  }

  return messages;
}

// Note: Client-safe email parsing utilities (extractSenderDomain, extractSenderName, groupEmailsBySender)
// have been moved to subscription-detector.ts for safe client-side usage.
// Import them from there instead of this file.
