import { NextResponse } from 'next/server';
import type { Stream } from '@plasma-pay/core';

const mockStreams: Stream[] = [];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const role = searchParams.get('role') || 'sending';

    if (!address) {
      return NextResponse.json({ error: 'Missing address' }, { status: 400 });
    }

    const filtered = mockStreams.filter((s) =>
      role === 'sending'
        ? s.sender.toLowerCase() === address.toLowerCase()
        : s.recipient.toLowerCase() === address.toLowerCase()
    );

    return NextResponse.json({ streams: filtered });
  } catch (error) {
    return NextResponse.json({ streams: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      sender,
      recipient,
      depositAmount,
      duration,
      cliffDuration = 0,
      cancelable = true,
    } = body;

    if (!sender || !recipient || !depositAmount || !duration) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const now = Math.floor(Date.now() / 1000);
    const stream: Stream = {
      id: BigInt(mockStreams.length + 1),
      sender,
      recipient,
      depositAmount: BigInt(depositAmount),
      withdrawnAmount: BigInt(0),
      startTime: now,
      endTime: now + duration,
      cliffTime: now + cliffDuration,
      cliffAmount: BigInt(0),
      ratePerSecond: BigInt(depositAmount) / BigInt(duration),
      cancelable,
      active: true,
    };

    mockStreams.push(stream);

    return NextResponse.json({
      success: true,
      streamId: stream.id.toString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create stream' },
      { status: 500 }
    );
  }
}
