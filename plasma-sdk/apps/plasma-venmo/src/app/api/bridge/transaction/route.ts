/**
 * Bridge Transaction API
 * 
 * POST /api/bridge/transaction
 * Gets transaction data for executing a bridge from a specific provider.
 */

import { NextResponse } from 'next/server';
import {
  getBridgeTransaction,
  type BridgeProvider,
} from '@plasma-pay/aggregator';
import { checkRateLimit, rateLimitResponse } from '@/lib/api-utils';
import { RATE_LIMIT_CONFIGS } from '@/lib/rate-limiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface TransactionRequest {
  provider: BridgeProvider;
  fromChainId: number;
  fromToken: string;
  fromAmount: string;
  recipientAddress: string;
  userAddress?: string;
}

const VALID_PROVIDERS: BridgeProvider[] = ['lifi', 'debridge', 'squid', 'across'];

export async function POST(request: Request) {
  // Rate limiting - transaction requests are more sensitive
  const { allowed, retryAfter } = checkRateLimit(request, RATE_LIMIT_CONFIGS.payment);
  if (!allowed && retryAfter) {
    return rateLimitResponse(retryAfter);
  }
  
  try {
    const body = await request.json() as TransactionRequest;
    
    const { provider, fromChainId, fromToken, fromAmount, recipientAddress, userAddress } = body;
    
    // Validate required fields
    if (!provider || !fromChainId || !fromToken || !fromAmount || !recipientAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: provider, fromChainId, fromToken, fromAmount, recipientAddress' },
        { status: 400 }
      );
    }
    
    // Validate provider
    if (!VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        { error: `Invalid provider: ${provider}. Must be one of: ${VALID_PROVIDERS.join(', ')}` },
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
    
    if (userAddress && !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return NextResponse.json(
        { error: 'Invalid user address format' },
        { status: 400 }
      );
    }
    
    // Get transaction data
    const transaction = await getBridgeTransaction(provider, {
      fromChainId,
      fromToken,
      fromAmount,
      userAddress: userAddress || recipientAddress,
      recipientAddress,
    });
    
    if (!transaction) {
      return NextResponse.json(
        { error: `No transaction available from ${provider}` },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      provider,
      transaction,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Bridge transaction error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get transaction' },
      { status: 500 }
    );
  }
}
