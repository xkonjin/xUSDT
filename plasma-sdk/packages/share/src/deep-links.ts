/**
 * Deep Link Utilities
 *
 * Generate and parse deep links for the Plasma SDK apps.
 */

export type DeepLinkType =
  | 'pay'        // Pay a specific link
  | 'claim'      // Claim a payment
  | 'bill'       // View/pay a bill
  | 'request'    // View a payment request
  | 'invite'     // Referral invite
  | 'stream'     // View a stream
  | 'send'       // Open send money screen with pre-filled data
  | 'scan';      // Open receipt scanner

export interface DeepLinkParams {
  type: DeepLinkType;
  id?: string;          // Resource ID (payment link, bill, etc.)
  amount?: number;      // Pre-filled amount
  recipient?: string;   // Pre-filled recipient (address, email, or phone)
  memo?: string;        // Pre-filled memo
  ref?: string;         // Referral code
  source?: string;      // Source tracking
}

const BASE_URL = 'https://pay.plasma.to';
const APP_SCHEME = 'plasmapay';

/**
 * Generate a web deep link URL
 */
export function generateWebDeepLink(params: DeepLinkParams): string {
  const { type, id, amount, recipient, memo, ref, source } = params;

  let path = '';
  const queryParams = new URLSearchParams();

  switch (type) {
    case 'pay':
      path = id ? `/p/${id}` : '/send';
      break;
    case 'claim':
      path = `/claim/${id}`;
      break;
    case 'bill':
      path = `/bill/${id}`;
      break;
    case 'request':
      path = `/request/${id}`;
      break;
    case 'invite':
      path = '/join';
      if (id) queryParams.set('ref', id);
      break;
    case 'stream':
      path = `/stream/${id}`;
      break;
    case 'send':
      path = '/send';
      break;
    case 'scan':
      path = '/scan';
      break;
  }

  if (amount) queryParams.set('amount', amount.toString());
  if (recipient) queryParams.set('to', recipient);
  if (memo) queryParams.set('memo', memo);
  if (ref && type !== 'invite') queryParams.set('ref', ref);
  if (source) queryParams.set('utm_source', source);

  const queryString = queryParams.toString();
  return `${BASE_URL}${path}${queryString ? `?${queryString}` : ''}`;
}

/**
 * Generate an app scheme deep link (for mobile apps)
 */
export function generateAppDeepLink(params: DeepLinkParams): string {
  const { type, id, amount, recipient, memo, ref } = params;

  let path = '';
  const queryParams = new URLSearchParams();

  switch (type) {
    case 'pay':
      path = id ? `pay/${id}` : 'send';
      break;
    case 'claim':
      path = `claim/${id}`;
      break;
    case 'bill':
      path = `bill/${id}`;
      break;
    case 'request':
      path = `request/${id}`;
      break;
    case 'invite':
      path = 'invite';
      if (id) queryParams.set('ref', id);
      break;
    case 'stream':
      path = `stream/${id}`;
      break;
    case 'send':
      path = 'send';
      break;
    case 'scan':
      path = 'scan';
      break;
  }

  if (amount) queryParams.set('amount', amount.toString());
  if (recipient) queryParams.set('to', recipient);
  if (memo) queryParams.set('memo', memo);
  if (ref && type !== 'invite') queryParams.set('ref', ref);

  const queryString = queryParams.toString();
  return `${APP_SCHEME}://${path}${queryString ? `?${queryString}` : ''}`;
}

/**
 * Generate a universal link (tries app first, falls back to web)
 */
export function generateUniversalLink(params: DeepLinkParams): string {
  // Universal links use the web URL - iOS/Android will intercept
  // if the app is installed
  return generateWebDeepLink(params);
}

/**
 * Parse a deep link URL
 */
export function parseDeepLink(url: string): DeepLinkParams | null {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    const params = parsed.searchParams;

    let type: DeepLinkType = 'send';
    let id: string | undefined;

    // Parse path
    if (path.startsWith('/p/')) {
      type = 'pay';
      id = path.slice(3);
    } else if (path.startsWith('/claim/')) {
      type = 'claim';
      id = path.slice(7);
    } else if (path.startsWith('/bill/')) {
      type = 'bill';
      id = path.slice(6);
    } else if (path.startsWith('/request/')) {
      type = 'request';
      id = path.slice(9);
    } else if (path === '/join' || path.startsWith('/invite')) {
      type = 'invite';
      id = params.get('ref') || undefined;
    } else if (path.startsWith('/stream/')) {
      type = 'stream';
      id = path.slice(8);
    } else if (path === '/send') {
      type = 'send';
    } else if (path === '/scan') {
      type = 'scan';
    }

    return {
      type,
      id,
      amount: params.get('amount') ? parseFloat(params.get('amount')!) : undefined,
      recipient: params.get('to') || undefined,
      memo: params.get('memo') || undefined,
      ref: params.get('ref') || undefined,
      source: params.get('utm_source') || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Create a short share URL
 */
export function createShareUrl(shortCode: string, baseUrl: string = BASE_URL): string {
  return `${baseUrl}/s/${shortCode}`;
}
