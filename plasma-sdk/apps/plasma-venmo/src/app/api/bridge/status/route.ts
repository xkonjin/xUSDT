/**
 * Bridge Status API
 * 
 * GET /api/bridge/status
 * Checks the status of a bridge transaction.
 */

import { NextResponse } from 'next/server';
import {
  getBridgeStatus,
  type BridgeProvider,
} from '@plasma-pay/aggregator';
import { checkRateLimit, rateLimitResponse } from '@/lib/api-utils';
import { RATE_LIMIT_CONFIGS } from '@/lib/rate-limiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_PROVIDERS: BridgeProvider[] = ['lifi', 'debridge', 'squid', 'across'];

export async function GET(request: Request) {
  // Rate limiting
  const { allowed, headers, retryAfter } = checkRateLimit(request, RATE_LIMIT_CONFIGS.read);
  if (!allowed && retryAfter) {
    return rateLimitResponse(retryAfter);
  }
  
  try {
    const { searchParams } = new URL(request.url);
    
    const provider = searchParams.get('provider') as BridgeProvider | null;
    const txHash = searchParams.get('txHash');
    const orderId = searchParams.get('orderId');
    const fromChainId = searchParams.get('fromChainId');
    const toChainId = searchParams.get('toChainId');
    
    // Validate provider
    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        { error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Validate required params based on provider
    if (provider === 'debridge' && !orderId) {
      return NextResponse.json(
        { error: 'orderId is required for deBridge status' },
        { status: 400 }
      );
    }
    
    if ((provider === 'lifi' || provider === 'squid' || provider === 'across') && !txHash) {
      return NextResponse.json(
        { error: 'txHash is required for this provider' },
        { status: 400 }
      );
    }
    
    // Get status
    const status = await getBridgeStatus(provider, {
      txHash: txHash || undefined,
      orderId: orderId || undefined,
      fromChainId: fromChainId ? parseInt(fromChainId) : undefined,
      toChainId: toChainId ? parseInt(toChainId) : undefined,
    });
    
    return NextResponse.json({
      provider,
      ...status,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Bridge status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get status' },
      { status: 500 }
    );
  }
}
