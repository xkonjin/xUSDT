/**
 * Plasma Gasless Relay API Route
 * 
 * Forwards signed EIP-3009 authorizations to api.plasma.to for FREE execution.
 * Plasma pays gas - users/merchants pay nothing.
 * 
 * Rate Limits: 10 tx/day per address, 10K USDT0/day, 20 tx/day per IP
 */

import { NextRequest, NextResponse } from 'next/server';
import { PLASMA_GASLESS_API } from '@plasma-pay/gasless';

// Server-side secret - never exposed to client
const PLASMA_RELAYER_SECRET = process.env.PLASMA_RELAYER_SECRET;

interface GaslessRequest {
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

// POST /api/relay - Submit authorization for gasless execution
export async function POST(request: NextRequest) {
  if (!PLASMA_RELAYER_SECRET) {
    return NextResponse.json({ error: 'Gasless not configured' }, { status: 503 });
  }

  try {
    // Get user IP for rate limiting
    const userIP = request.headers.get('x-forwarded-for')?.split(',')[0].trim() 
      || request.headers.get('x-real-ip') 
      || 'unknown';

    const body: GaslessRequest = await request.json();
    
    if (!body.authorization || !body.signature) {
      return NextResponse.json({ error: 'Missing authorization/signature' }, { status: 400 });
    }

    // Forward to Plasma gasless API
    const resp = await fetch(`${PLASMA_GASLESS_API}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': PLASMA_RELAYER_SECRET,
        'X-User-IP': userIP,
      },
      body: JSON.stringify(body),
    });

    // Handle rate limiting
    if (resp.status === 429) {
      const err = await resp.json().catch(() => ({}));
      return NextResponse.json({ error: 'Rate limit exceeded', details: err }, { status: 429 });
    }

    if (!resp.ok) {
      return NextResponse.json({ error: await resp.text() }, { status: resp.status });
    }

    const result = await resp.json();
    const submissionId = result.id;

    // Poll for confirmation (up to 60s)
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      
      const status = await fetch(`${PLASMA_GASLESS_API}/status/${submissionId}`, {
        headers: { 'X-Internal-Secret': PLASMA_RELAYER_SECRET },
      });

      if (status.ok) {
        const data = await status.json();
        
        if (data.status === 'confirmed') {
          return NextResponse.json({
            success: true,
            txHash: data.txHash,
            gasless: true,
          });
        }
        
        if (data.status === 'failed') {
          return NextResponse.json({ error: data.error || 'Failed' }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ error: 'Timeout' }, { status: 408 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Relay failed' },
      { status: 500 }
    );
  }
}

// GET /api/relay?id=<submissionId> - Check status
export async function GET(request: NextRequest) {
  if (!PLASMA_RELAYER_SECRET) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const resp = await fetch(`${PLASMA_GASLESS_API}/status/${id}`, {
    headers: { 'X-Internal-Secret': PLASMA_RELAYER_SECRET },
  });

  if (!resp.ok) {
    return NextResponse.json({ error: 'Status check failed' }, { status: resp.status });
  }

  return NextResponse.json(await resp.json());
}

