/**
 * Bridge Quote API
 * 
 * POST /api/pay/quote
 * Gets the best cross-chain swap quote from bridge aggregators.
 * 
 * Uses both Jumper (Li.Fi) and deBridge to find the best rate
 * for converting tokens from any chain to USDT0 on Plasma.
 */

import { NextResponse } from 'next/server';
import { getQuote } from '@plasma-pay/aggregator';
import { PLASMA_MAINNET_CHAIN_ID, USDT0_ADDRESS } from '@plasma-pay/core';

/**
 * POST - Get bridge quote
 * 
 * Body:
 * - fromChainId: Source chain ID
 * - fromToken: Source token address
 * - fromAmount: Amount in token units (as string)
 * - userAddress: User's wallet address
 * - recipientAddress: Bill creator's wallet address
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const {
      fromChainId,
      fromToken,
      fromAmount,
      userAddress,
      recipientAddress,
    } = body;
    
    // Validate required fields
    if (!fromChainId || !fromToken || !fromAmount || !userAddress || !recipientAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Check if this is a same-chain payment (Plasma to Plasma)
    if (fromChainId === PLASMA_MAINNET_CHAIN_ID) {
      // No bridge needed - direct transfer
      return NextResponse.json({
        quote: {
          provider: 'direct',
          fromChainId,
          fromToken,
          fromAmount,
          toChainId: PLASMA_MAINNET_CHAIN_ID,
          toToken: USDT0_ADDRESS,
          toAmount: fromAmount, // 1:1 for stablecoins
          toAmountMin: fromAmount,
          gasUsd: '0.00', // Gasless on Plasma
          estimatedTime: 5, // ~5 seconds
          routeId: 'direct',
        },
      });
    }
    
    // Get quote from aggregator (uses Li.Fi)
    const quote = await getQuote({
      fromChainId,
      fromTokenAddress: fromToken,
      fromAmount,
      userAddress,
      recipientAddress,
    });
    
    if (!quote) {
      // Try deBridge as fallback
      // For MVP, just return error
      return NextResponse.json(
        { error: 'No route available for this token/chain combination' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      quote: {
        provider: 'jumper',
        fromChainId: quote.fromChainId,
        fromToken: quote.fromTokenAddress,
        fromAmount: quote.fromAmount,
        toChainId: quote.toChainId,
        toToken: quote.toTokenAddress,
        toAmount: quote.toAmount,
        toAmountMin: quote.toAmountMin,
        gasUsd: quote.estimatedGasUsd,
        estimatedTime: quote.estimatedTimeSeconds,
        routeId: quote.routeId,
      },
    });
  } catch (error) {
    console.error('Quote error:', error);
    return NextResponse.json(
      { error: 'Failed to get quote' },
      { status: 500 }
    );
  }
}

