/**
 * Bridge Quote API
 * 
 * POST /api/bridge/quote
 * Gets quotes from multiple bridge providers for converting tokens to USDT0 on Plasma.
 * 
 * GET /api/bridge/quote
 * Returns supported chains and tokens (cached for 5 minutes).
 */

import { NextResponse } from 'next/server';
import {
  getBestBridgeQuote,
  POPULAR_SOURCE_CHAINS,
  POPULAR_TOKENS,
} from '@plasma-pay/aggregator';
import { checkRateLimit, rateLimitResponse } from '@/lib/api-utils';
import { RATE_LIMIT_CONFIGS } from '@/lib/rate-limiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface QuoteRequest {
  fromChainId: number;
  fromToken: string;
  fromAmount: string;
  recipientAddress: string;
  userAddress?: string;
}

export async function POST(request: Request) {
  // Rate limiting
  const { allowed, retryAfter } = checkRateLimit(request, RATE_LIMIT_CONFIGS.bridge);
  if (!allowed && retryAfter) {
    return rateLimitResponse(retryAfter);
  }
  
  try {
    const body = await request.json() as QuoteRequest;
    
    const { fromChainId, fromToken, fromAmount, recipientAddress, userAddress } = body;
    
    // Validate required fields
    if (!fromChainId || !fromToken || !fromAmount || !recipientAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: fromChainId, fromToken, fromAmount, recipientAddress' },
        { status: 400 }
      );
    }
    
    // Validate chain is supported
    const chain = POPULAR_SOURCE_CHAINS.find(c => c.chainId === fromChainId);
    if (!chain) {
      return NextResponse.json(
        { error: `Chain ${fromChainId} is not supported` },
        { status: 400 }
      );
    }
    
    // Validate amount is positive
    const amount = BigInt(fromAmount);
    if (amount <= 0n) {
      return NextResponse.json(
        { error: 'Amount must be positive' },
        { status: 400 }
      );
    }
    
    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)) {
      return NextResponse.json(
        { error: 'Invalid recipient address format' },
        { status: 400 }
      );
    }
    
    // Get quotes from all providers
    const result = await getBestBridgeQuote({
      fromChainId,
      fromToken,
      fromAmount,
      userAddress: userAddress || recipientAddress,
      recipientAddress,
    });
    
    // Return result even if no quotes (frontend handles empty state)
    return NextResponse.json({
      best: result.best,
      all: result.all,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Bridge quote error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get quote' },
      { status: 500 }
    );
  }
}

// GET endpoint for fetching supported chains and tokens - cached for 5 minutes
export async function GET() {
  const response = NextResponse.json({
    chains: POPULAR_SOURCE_CHAINS,
    tokens: POPULAR_TOKENS,
  });
  
  // Add cache headers - data is static so cache aggressively
  response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=60');
  response.headers.set('CDN-Cache-Control', 'public, max-age=300');
  
  return response;
}
