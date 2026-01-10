/**
 * Bridge Transaction API
 * 
 * POST /api/pay/transaction
 * Builds the transaction data for executing a cross-chain payment.
 * 
 * This endpoint is called after the user confirms the quote.
 * Returns transaction data that can be signed and submitted.
 */

import { NextResponse } from 'next/server';
import { PLASMA_MAINNET_CHAIN_ID, USDT0_ADDRESS } from '@plasma-pay/core';
import { prisma } from '@plasma-pay/db';

/**
 * POST - Build bridge transaction
 * 
 * Body:
 * - intentId: Payment intent ID
 * - provider: 'jumper' or 'debridge' or 'direct'
 * - fromChainId: Source chain ID
 * - fromToken: Source token address
 * - fromAmount: Amount in token units
 * - userAddress: User's wallet address
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const {
      intentId,
      provider,
      fromChainId,
      fromToken,
      fromAmount,
      userAddress,
    } = body;
    
    // Validate required fields
    if (!intentId || !fromChainId || !fromToken || !fromAmount || !userAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Get payment intent to verify it exists and get recipient
    const intent = await prisma.paymentIntent.findUnique({
      where: { id: intentId },
    });
    
    if (!intent) {
      return NextResponse.json(
        { error: 'Payment intent not found' },
        { status: 404 }
      );
    }
    
    if (intent.status !== 'pending') {
      return NextResponse.json(
        { error: `Payment is ${intent.status}` },
        { status: 400 }
      );
    }
    
    // Handle direct Plasma-to-Plasma transfer
    if (provider === 'direct' || fromChainId === PLASMA_MAINNET_CHAIN_ID) {
      // For Plasma, we use gasless transfer (EIP-3009)
      // Return data for the gasless transfer flow
      return NextResponse.json({
        type: 'gasless',
        chainId: PLASMA_MAINNET_CHAIN_ID,
        tokenAddress: USDT0_ADDRESS,
        to: intent.recipientAddress,
        value: fromAmount,
        // The frontend should use the gasless package to build the signature
      });
    }
    
    // For cross-chain, we need to build the bridge transaction
    // Using the aggregator to get transaction data
    // Note: In production, you'd use the Li.Fi SDK's transaction builder
    
    // Mark intent as processing
    await prisma.paymentIntent.update({
      where: { id: intentId },
      data: {
        status: 'processing',
        payerAddress: userAddress,
        sourceChainId: fromChainId,
        sourceToken: fromToken,
        bridgeProvider: provider,
      },
    });
    
    // Return placeholder transaction data
    // In production, integrate with Li.Fi SDK or deBridge API
    return NextResponse.json({
      type: 'bridge',
      provider,
      chainId: fromChainId,
      // Transaction data would come from Li.Fi or deBridge
      // This is a placeholder for the integration
      message: 'Use the Li.Fi SDK to execute the swap',
      swapParams: {
        fromChainId,
        fromTokenAddress: fromToken,
        fromAmount,
        toChainId: PLASMA_MAINNET_CHAIN_ID,
        toTokenAddress: USDT0_ADDRESS,
        toAddress: intent.recipientAddress,
        userAddress,
      },
    });
  } catch (error) {
    console.error('Transaction build error:', error);
    return NextResponse.json(
      { error: 'Failed to build transaction' },
      { status: 500 }
    );
  }
}

