import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { streamId } = await request.json();

    if (!streamId) {
      return NextResponse.json({ error: 'Missing streamId' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      txHash: '0x' + '0'.repeat(64),
      amount: '0',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Withdraw failed' },
      { status: 500 }
    );
  }
}
