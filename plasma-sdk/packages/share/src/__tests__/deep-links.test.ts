/**
 * Deep Links Tests
 * 
 * Tests for deep link generation and parsing utilities
 */

import {
  generateWebDeepLink,
  generateAppDeepLink,
  generateUniversalLink,
  parseDeepLink,
  createShareUrl,
  type DeepLinkParams,
  type DeepLinkType,
} from '../deep-links';

describe('generateWebDeepLink', () => {
  it('generates pay link with ID', () => {
    const url = generateWebDeepLink({ type: 'pay', id: 'abc123' });
    expect(url).toBe('https://pay.plasma.to/p/abc123');
  });

  it('generates pay link without ID (redirects to send)', () => {
    const url = generateWebDeepLink({ type: 'pay' });
    expect(url).toBe('https://pay.plasma.to/send');
  });

  it('generates claim link', () => {
    const url = generateWebDeepLink({ type: 'claim', id: 'claim123' });
    expect(url).toBe('https://pay.plasma.to/claim/claim123');
  });

  it('generates bill link', () => {
    const url = generateWebDeepLink({ type: 'bill', id: 'bill123' });
    expect(url).toBe('https://pay.plasma.to/bill/bill123');
  });

  it('generates request link', () => {
    const url = generateWebDeepLink({ type: 'request', id: 'req123' });
    expect(url).toBe('https://pay.plasma.to/request/req123');
  });

  it('generates invite link', () => {
    const url = generateWebDeepLink({ type: 'invite' });
    expect(url).toBe('https://pay.plasma.to/join');
  });

  it('generates invite link with referral code', () => {
    const url = generateWebDeepLink({ type: 'invite', id: 'REF123' });
    expect(url).toBe('https://pay.plasma.to/join?ref=REF123');
  });

  it('generates stream link', () => {
    const url = generateWebDeepLink({ type: 'stream', id: 'stream123' });
    expect(url).toBe('https://pay.plasma.to/stream/stream123');
  });

  it('generates send link', () => {
    const url = generateWebDeepLink({ type: 'send' });
    expect(url).toBe('https://pay.plasma.to/send');
  });

  it('generates scan link', () => {
    const url = generateWebDeepLink({ type: 'scan' });
    expect(url).toBe('https://pay.plasma.to/scan');
  });

  it('adds amount query parameter', () => {
    const url = generateWebDeepLink({ type: 'send', amount: 100 });
    expect(url).toContain('amount=100');
  });

  it('adds recipient query parameter', () => {
    const url = generateWebDeepLink({ type: 'send', recipient: '0x123' });
    expect(url).toContain('to=0x123');
  });

  it('adds memo query parameter', () => {
    const url = generateWebDeepLink({ type: 'send', memo: 'Test payment' });
    // URLSearchParams encodes spaces as + or %20
    expect(url).toMatch(/memo=Test(\+|%20)payment/);
  });

  it('adds ref query parameter (non-invite)', () => {
    const url = generateWebDeepLink({ type: 'send', ref: 'REF123' });
    expect(url).toContain('ref=REF123');
  });

  it('adds utm_source query parameter', () => {
    const url = generateWebDeepLink({ type: 'send', source: 'twitter' });
    expect(url).toContain('utm_source=twitter');
  });

  it('combines multiple query parameters', () => {
    const url = generateWebDeepLink({
      type: 'send',
      amount: 50,
      recipient: '0xabc',
      memo: 'Dinner',
    });
    expect(url).toContain('amount=50');
    expect(url).toContain('to=0xabc');
    expect(url).toContain('memo=Dinner');
  });
});

describe('generateAppDeepLink', () => {
  it('generates pay link with ID', () => {
    const url = generateAppDeepLink({ type: 'pay', id: 'abc123' });
    expect(url).toBe('plasmapay://pay/abc123');
  });

  it('generates pay link without ID (redirects to send)', () => {
    const url = generateAppDeepLink({ type: 'pay' });
    expect(url).toBe('plasmapay://send');
  });

  it('generates claim link', () => {
    const url = generateAppDeepLink({ type: 'claim', id: 'claim123' });
    expect(url).toBe('plasmapay://claim/claim123');
  });

  it('generates bill link', () => {
    const url = generateAppDeepLink({ type: 'bill', id: 'bill123' });
    expect(url).toBe('plasmapay://bill/bill123');
  });

  it('generates request link', () => {
    const url = generateAppDeepLink({ type: 'request', id: 'req123' });
    expect(url).toBe('plasmapay://request/req123');
  });

  it('generates invite link', () => {
    const url = generateAppDeepLink({ type: 'invite' });
    expect(url).toBe('plasmapay://invite');
  });

  it('generates invite link with referral code', () => {
    const url = generateAppDeepLink({ type: 'invite', id: 'REF123' });
    expect(url).toBe('plasmapay://invite?ref=REF123');
  });

  it('generates stream link', () => {
    const url = generateAppDeepLink({ type: 'stream', id: 'stream123' });
    expect(url).toBe('plasmapay://stream/stream123');
  });

  it('generates send link', () => {
    const url = generateAppDeepLink({ type: 'send' });
    expect(url).toBe('plasmapay://send');
  });

  it('generates scan link', () => {
    const url = generateAppDeepLink({ type: 'scan' });
    expect(url).toBe('plasmapay://scan');
  });

  it('adds query parameters', () => {
    const url = generateAppDeepLink({
      type: 'send',
      amount: 100,
      recipient: '0x123',
    });
    expect(url).toContain('amount=100');
    expect(url).toContain('to=0x123');
  });
});

describe('generateUniversalLink', () => {
  it('returns web deep link (for universal link handling)', () => {
    const params: DeepLinkParams = { type: 'pay', id: 'abc123' };
    const universalLink = generateUniversalLink(params);
    const webLink = generateWebDeepLink(params);
    
    expect(universalLink).toBe(webLink);
  });

  it('uses HTTPS scheme', () => {
    const url = generateUniversalLink({ type: 'send' });
    expect(url).toMatch(/^https:\/\//);
  });
});

describe('parseDeepLink', () => {
  it('parses pay link', () => {
    const result = parseDeepLink('https://pay.plasma.to/p/abc123');
    expect(result?.type).toBe('pay');
    expect(result?.id).toBe('abc123');
  });

  it('parses claim link', () => {
    const result = parseDeepLink('https://pay.plasma.to/claim/claim123');
    expect(result?.type).toBe('claim');
    expect(result?.id).toBe('claim123');
  });

  it('parses bill link', () => {
    const result = parseDeepLink('https://pay.plasma.to/bill/bill123');
    expect(result?.type).toBe('bill');
    expect(result?.id).toBe('bill123');
  });

  it('parses request link', () => {
    const result = parseDeepLink('https://pay.plasma.to/request/req123');
    expect(result?.type).toBe('request');
    expect(result?.id).toBe('req123');
  });

  it('parses invite/join link', () => {
    const result = parseDeepLink('https://pay.plasma.to/join?ref=REF123');
    expect(result?.type).toBe('invite');
    expect(result?.id).toBe('REF123');
  });

  it('parses stream link', () => {
    const result = parseDeepLink('https://pay.plasma.to/stream/stream123');
    expect(result?.type).toBe('stream');
    expect(result?.id).toBe('stream123');
  });

  it('parses send link', () => {
    const result = parseDeepLink('https://pay.plasma.to/send');
    expect(result?.type).toBe('send');
  });

  it('parses scan link', () => {
    const result = parseDeepLink('https://pay.plasma.to/scan');
    expect(result?.type).toBe('scan');
  });

  it('parses amount query parameter', () => {
    const result = parseDeepLink('https://pay.plasma.to/send?amount=100');
    expect(result?.amount).toBe(100);
  });

  it('parses recipient (to) query parameter', () => {
    const result = parseDeepLink('https://pay.plasma.to/send?to=0x123');
    expect(result?.recipient).toBe('0x123');
  });

  it('parses memo query parameter', () => {
    const result = parseDeepLink('https://pay.plasma.to/send?memo=Test');
    expect(result?.memo).toBe('Test');
  });

  it('parses ref query parameter', () => {
    const result = parseDeepLink('https://pay.plasma.to/send?ref=REF123');
    expect(result?.ref).toBe('REF123');
  });

  it('parses utm_source query parameter', () => {
    const result = parseDeepLink('https://pay.plasma.to/send?utm_source=twitter');
    expect(result?.source).toBe('twitter');
  });

  it('parses all query parameters together', () => {
    const result = parseDeepLink(
      'https://pay.plasma.to/send?amount=50&to=0xabc&memo=Lunch&ref=REF&utm_source=sms'
    );
    expect(result?.amount).toBe(50);
    expect(result?.recipient).toBe('0xabc');
    expect(result?.memo).toBe('Lunch');
    expect(result?.ref).toBe('REF');
    expect(result?.source).toBe('sms');
  });

  it('returns null for invalid URL', () => {
    const result = parseDeepLink('not-a-url');
    expect(result).toBeNull();
  });

  it('handles URL decode correctly', () => {
    const result = parseDeepLink('https://pay.plasma.to/send?memo=Hello%20World');
    expect(result?.memo).toBe('Hello World');
  });

  it('defaults to send type for unknown paths', () => {
    const result = parseDeepLink('https://pay.plasma.to/unknown');
    expect(result?.type).toBe('send');
  });
});

describe('createShareUrl', () => {
  it('creates share URL with default base', () => {
    const url = createShareUrl('abc123');
    expect(url).toBe('https://pay.plasma.to/s/abc123');
  });

  it('creates share URL with custom base', () => {
    const url = createShareUrl('abc123', 'https://example.com');
    expect(url).toBe('https://example.com/s/abc123');
  });

  it('handles short codes correctly', () => {
    const codes = ['test12', 'ABCD12', 'mixed1'];
    for (const code of codes) {
      const url = createShareUrl(code);
      expect(url).toContain(`/s/${code}`);
    }
  });
});

describe('round-trip: generate and parse', () => {
  const linkTypes: DeepLinkType[] = ['pay', 'claim', 'bill', 'request', 'stream'];

  linkTypes.forEach((type) => {
    it(`round-trips ${type} link correctly`, () => {
      const params: DeepLinkParams = { type, id: 'test123' };
      const url = generateWebDeepLink(params);
      const parsed = parseDeepLink(url);
      
      expect(parsed?.type).toBe(type);
      expect(parsed?.id).toBe('test123');
    });
  });

  it('round-trips send link with params', () => {
    const params: DeepLinkParams = {
      type: 'send',
      amount: 99.99,
      recipient: '0x1234567890abcdef',
      memo: 'Test',
    };
    const url = generateWebDeepLink(params);
    const parsed = parseDeepLink(url);
    
    expect(parsed?.type).toBe('send');
    expect(parsed?.amount).toBe(99.99);
    expect(parsed?.recipient).toBe('0x1234567890abcdef');
    expect(parsed?.memo).toBe('Test');
  });

  it('round-trips invite link with ref', () => {
    const params: DeepLinkParams = { type: 'invite', id: 'REF12345' };
    const url = generateWebDeepLink(params);
    const parsed = parseDeepLink(url);
    
    expect(parsed?.type).toBe('invite');
    expect(parsed?.id).toBe('REF12345');
  });
});
