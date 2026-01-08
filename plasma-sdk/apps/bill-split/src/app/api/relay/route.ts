/**
 * Plasma Gasless Relay API Route
 * 
 * This server-side endpoint forwards signed EIP-3009 authorizations to the
 * Plasma gasless relayer API (https://api.plasma.to) for FREE execution.
 * 
 * IMPORTANT: This route keeps the PLASMA_RELAYER_SECRET secure on the server
 * and properly forwards the user's real IP address for rate limiting.
 * 
 * Rate Limits (per Plasma API docs):
 * - 10 transfers per day per address
 * - 10,000 USDT0 daily volume per address  
 * - 20 transfers per day per IP
 * - Minimum transfer: 1 USDT0
 * - Resets at 00:00 UTC
 * 
 * API Docs: https://api.plasma.to (internal-only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { PLASMA_GASLESS_API } from '@plasma-pay/gasless';

// =============================================================================
// Environment Configuration
// =============================================================================
// PLASMA_RELAYER_SECRET: Required for authenticating with Plasma gasless API
// This secret should NEVER be exposed to the client - only used server-side
// =============================================================================
const PLASMA_RELAYER_SECRET = process.env.PLASMA_RELAYER_SECRET;

// =============================================================================
// Types
// =============================================================================

interface GaslessSubmitRequest {
  authorization: {
    from: string;
    to: string;
    value: string;
    validAfter: string;
    validBefore: string;
    nonce: string;
  };
  signature: string;
}

interface GaslessSubmitResponse {
  id: string;
  status: 'queued' | 'pending' | 'submitted' | 'confirmed' | 'failed';
}

interface GaslessStatusResponse {
  id: string;
  status: 'pending' | 'queued' | 'submitted' | 'confirmed' | 'failed';
  txHash?: string;
  gasUsed?: string;
  error?: string;
}

// =============================================================================
// POST /api/relay - Submit authorization for gasless execution
// =============================================================================

export async function POST(request: NextRequest) {
  // Validate server-side secret is configured
  if (!PLASMA_RELAYER_SECRET) {
    console.error('PLASMA_RELAYER_SECRET not configured');
    return NextResponse.json(
      { error: 'Gasless relayer not configured' },
      { status: 503 }
    );
  }

  try {
    // Extract user IP for rate limiting (forwarded from Vercel/Nginx/etc.)
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const userIP = forwardedFor?.split(',')[0].trim() || realIp || 'unknown';

    // Parse and validate request body
    const body: GaslessSubmitRequest = await request.json();
    
    if (!body.authorization || !body.signature) {
      return NextResponse.json(
        { error: 'Missing authorization or signature' },
        { status: 400 }
      );
    }

    const { authorization, signature } = body;

    // Basic validation
    if (!authorization.from || !authorization.to || !authorization.value) {
      return NextResponse.json(
        { error: 'Invalid authorization: missing from, to, or value' },
        { status: 400 }
      );
    }

    // Forward to Plasma gasless API
    const submitResponse = await fetch(`${PLASMA_GASLESS_API}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': PLASMA_RELAYER_SECRET,
        'X-User-IP': userIP,
      },
      body: JSON.stringify({
        authorization: {
          from: authorization.from,
          to: authorization.to,
          value: authorization.value,
          validAfter: authorization.validAfter,
          validBefore: authorization.validBefore,
          nonce: authorization.nonce,
        },
        signature,
      }),
    });

    // Handle rate limiting
    if (submitResponse.status === 429) {
      const errorData = await submitResponse.json().catch(() => ({}));
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          details: errorData.error,
          retryAfter: errorData.error?.details?.resetsAt,
        },
        { status: 429 }
      );
    }

    // Handle other errors
    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error('Plasma gasless API error:', submitResponse.status, errorText);
      return NextResponse.json(
        { error: `Gasless API error: ${errorText}` },
        { status: submitResponse.status }
      );
    }

    // Parse successful response
    const submitResult: GaslessSubmitResponse = await submitResponse.json();
    const submissionId = submitResult.id;

    // Poll for confirmation (up to 60 seconds)
    // The API returns immediately with "queued" status, so we need to poll
    let txHash: string | undefined;
    let finalStatus = submitResult.status;
    let gasUsed: string | undefined;

    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      const statusResponse = await fetch(
        `${PLASMA_GASLESS_API}/status/${submissionId}`,
        {
          headers: {
            'X-Internal-Secret': PLASMA_RELAYER_SECRET,
          },
        }
      );

      if (statusResponse.ok) {
        const statusData: GaslessStatusResponse = await statusResponse.json();
        finalStatus = statusData.status;
        txHash = statusData.txHash;
        gasUsed = statusData.gasUsed;

        if (finalStatus === 'confirmed') {
          return NextResponse.json({
            success: true,
            txHash,
            submissionId,
            gasUsed,
            gasless: true, // Indicates Plasma paid the gas
          });
        }

        if (finalStatus === 'failed') {
          return NextResponse.json(
            { 
              error: statusData.error || 'Transaction failed',
              txHash,
              submissionId,
            },
            { status: 500 }
          );
        }

        // Continue polling for pending/queued/submitted statuses
      }
    }

    // Timeout - return partial result
    return NextResponse.json(
      { 
        error: 'Timeout waiting for confirmation',
        submissionId,
        status: finalStatus,
        txHash,
      },
      { status: 408 }
    );

  } catch (error) {
    console.error('Relay error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Relay failed' },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET /api/relay?id=<submissionId> - Check status of a submission
// =============================================================================

export async function GET(request: NextRequest) {
  if (!PLASMA_RELAYER_SECRET) {
    return NextResponse.json(
      { error: 'Gasless relayer not configured' },
      { status: 503 }
    );
  }

  const submissionId = request.nextUrl.searchParams.get('id');
  
  if (!submissionId) {
    return NextResponse.json(
      { error: 'Missing submission id parameter' },
      { status: 400 }
    );
  }

  try {
    const statusResponse = await fetch(
      `${PLASMA_GASLESS_API}/status/${submissionId}`,
      {
        headers: {
          'X-Internal-Secret': PLASMA_RELAYER_SECRET,
        },
      }
    );

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      return NextResponse.json(
        { error: `Status check failed: ${errorText}` },
        { status: statusResponse.status }
      );
    }

    const statusData: GaslessStatusResponse = await statusResponse.json();
    
    return NextResponse.json({
      success: statusData.status === 'confirmed',
      status: statusData.status,
      txHash: statusData.txHash,
      gasUsed: statusData.gasUsed,
      error: statusData.error,
      gasless: true,
    });

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Status check failed' },
      { status: 500 }
    );
  }
}

