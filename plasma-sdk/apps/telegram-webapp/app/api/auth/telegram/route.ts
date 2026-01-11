/**
 * Telegram Auth API Route
 *
 * POST /api/auth/telegram
 *
 * Validates Telegram initData HMAC signature and returns user session
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleTelegramAuth, AuthRequest } from './handler';

export async function POST(request: NextRequest) {
  try {
    const body: AuthRequest = await request.json();
    const result = await handleTelegramAuth(body);

    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error('Telegram auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
