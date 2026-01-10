/**
 * Bridge Webhook Handler
 * 
 * POST /api/webhooks/bridge
 * Receives webhooks from bridge providers (Li.Fi, deBridge) when
 * cross-chain transfers complete.
 * 
 * Updates payment intent status and notifies bill creators.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@plasma-pay/db';
import crypto from 'crypto';

// ============================================================================
// WEBHOOK VALIDATION
// ============================================================================

/**
 * Validates Li.Fi webhook signature
 * Li.Fi uses HMAC-SHA256 signature in X-Lifi-Signature header
 */
function validateLifiSignature(payload: string, signature: string): boolean {
  const secret = process.env.LIFI_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('LIFI_WEBHOOK_SECRET not configured');
    return true; // Allow in development
  }
  
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSig)
  );
}

/**
 * Validates deBridge webhook signature
 * deBridge uses ECDSA signature
 */
function validateDebridgeSignature(_payload: string, _signature: string): boolean {
  const secret = process.env.DEBRIDGE_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('DEBRIDGE_WEBHOOK_SECRET not configured');
    return true; // Allow in development
  }
  
  // deBridge signature validation would go here
  // For MVP, we'll accept all webhooks
  return true;
}

// ============================================================================
// WEBHOOK HANDLER
// ============================================================================

/**
 * POST - Handle bridge completion webhook
 * 
 * Body format varies by provider:
 * 
 * Li.Fi:
 * {
 *   type: 'ROUTE_COMPLETED',
 *   routeId: string,
 *   transactionHash: string,
 *   destinationTransactionHash: string,
 *   fromChainId: number,
 *   toChainId: number,
 *   fromAddress: string,
 *   toAddress: string,
 * }
 * 
 * deBridge:
 * {
 *   orderId: string,
 *   status: 'Fulfilled',
 *   srcTxHash: string,
 *   dstTxHash: string,
 *   srcChainId: number,
 *   dstChainId: number,
 * }
 */
export async function POST(request: Request) {
  try {
    const payload = await request.text();
    const body = JSON.parse(payload);
    
    // Determine provider from headers or body
    const lifiSignature = request.headers.get('x-lifi-signature');
    const debridgeSignature = request.headers.get('x-debridge-signature');
    
    let provider: 'jumper' | 'debridge';
    let intentId: string | null = null;
    let destTxHash: string | null = null;
    
    // Handle Li.Fi webhook
    if (lifiSignature || body.routeId) {
      provider = 'jumper';
      
      // Validate signature
      if (lifiSignature && !validateLifiSignature(payload, lifiSignature)) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
      
      // Extract data
      destTxHash = body.destinationTransactionHash;
      
      // Find intent by metadata (would need to be stored with the route)
      // For MVP, we'll need to poll or use the intent ID in the route metadata
      const metadata = body.metadata as { intentId?: string } | undefined;
      intentId = metadata?.intentId || null;
    }
    // Handle deBridge webhook
    else if (debridgeSignature || body.orderId) {
      provider = 'debridge';
      
      // Validate signature
      if (debridgeSignature && !validateDebridgeSignature(payload, debridgeSignature)) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
      
      // Extract data
      destTxHash = body.dstTxHash;
      
      // deBridge orderId might contain our intentId
      // Format: PLASMA_INTENT_{intentId}
      if (body.orderId?.startsWith('PLASMA_INTENT_')) {
        intentId = body.orderId.replace('PLASMA_INTENT_', '');
      }
    } else {
      return NextResponse.json(
        { error: 'Unknown webhook provider' },
        { status: 400 }
      );
    }
    
    // If we don't have an intentId, try to find by transaction hash
    if (!intentId && destTxHash) {
      const intent = await prisma.paymentIntent.findFirst({
        where: {
          status: 'processing',
          destTxHash: null,
        },
        orderBy: { createdAt: 'desc' },
      });
      
      if (intent) {
        intentId = intent.id;
      }
    }
    
    if (!intentId) {
      console.log('Webhook received but no matching intent found:', body);
      return NextResponse.json({ received: true });
    }
    
    // Update payment intent
    const updatedIntent = await prisma.paymentIntent.update({
      where: { id: intentId },
      data: {
        status: 'completed',
        destTxHash,
        paidAt: new Date(),
      },
      include: {
        bill: {
          include: { participants: true },
        },
      },
    });
    
    console.log(`Payment intent ${intentId} completed via ${provider}`);
    
    // Update bill participant
    if (updatedIntent.bill) {
      const participant = updatedIntent.bill.participants[updatedIntent.participantIndex];
      if (participant) {
        await prisma.billParticipant.update({
          where: { id: participant.id },
          data: {
            paid: true,
            paidAt: new Date(),
            txHash: destTxHash || undefined,
          },
        });
      }
      
      // Check if bill is fully paid
      const allIntents = await prisma.paymentIntent.findMany({
        where: { billId: updatedIntent.billId },
      });
      
      const allPaid = allIntents.every(i => i.status === 'completed');
      
      if (allPaid) {
        await prisma.bill.update({
          where: { id: updatedIntent.billId },
          data: { status: 'completed' },
        });
        console.log(`Bill ${updatedIntent.billId} fully paid!`);
      }
    }
    
    // TODO: Send notification to bill creator via Telegram bot
    // This would require calling the bot's API or using a message queue
    
    return NextResponse.json({
      received: true,
      intentId,
      status: 'completed',
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

