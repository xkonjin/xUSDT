import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Server-side only - no NEXT_PUBLIC prefix
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

// System prompt for the assistant
const SYSTEM_PROMPT = `You are Plenny, the AI assistant for Plenmo - a zero-fee P2P payment app.

## YOUR PERSONALITY
- Name: Plenny
- Friendly, helpful, celebratory on wins, empathetic on errors
- Use simple language, no crypto jargon
- Keep responses SHORT (1-2 sentences, under 100 chars preferred)
- Max 1 emoji per message
- Be specific and actionable

## KEY FACTS ABOUT PLENMO
- Zero fees on all transactions
- Send money instantly to anyone
- Works like Venmo but with no fees
- Minimum send: $0.01, Maximum: $10,000
- If recipient doesn't have Plenmo, they get a claim link via email

## RULES
1. NEVER make up features that don't exist
2. NEVER share sensitive info or private keys
3. Always be encouraging about security
4. If unsure, say "I'm not sure, but I can help you find out!"
5. Celebrate successes enthusiastically
6. Be empathetic about errors - reassure funds are safe`;

export async function POST(request: Request) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Assistant not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { message, context, history } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Build context string
    const contextStr = context ? `
## CURRENT SITUATION
- Page: ${context.currentPage || 'Unknown'}
- Wallet connected: ${context.walletConnected ? 'Yes' : 'No'}
- Balance: ${context.balance || 'Unknown'}
${context.errors?.length > 0 ? `- Errors: ${context.errors.join(', ')}` : ''}
` : '';

    // Build history string
    const historyStr = history?.slice(-6)?.map(
      (h: { role: string; content: string }) => `${h.role}: ${h.content}`
    ).join('\n') || '';

    const prompt = `${SYSTEM_PROMPT}

${contextStr}

## RECENT CONVERSATION
${historyStr || '(New conversation)'}

## USER'S MESSAGE
"${message}"

## YOUR RESPONSE
Respond helpfully in 1-2 SHORT sentences (under 100 characters preferred):`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Clean up response
    let cleanResponse = response.trim()
      .replace(/^["']|["']$/g, '')
      .replace(/^\*+|\*+$/g, '')
      .split('\n')[0];
    
    if (cleanResponse.length > 200) {
      cleanResponse = cleanResponse.slice(0, 197) + '...';
    }

    // Detect emotion
    const lower = cleanResponse.toLowerCase();
    let emotion = 'neutral';
    if (lower.includes('🎉') || lower.includes('awesome') || lower.includes('success')) {
      emotion = 'excited';
    } else if (lower.includes('sorry') || lower.includes('error') || lower.includes('oops')) {
      emotion = 'concerned';
    } else if (lower.includes('👍') || lower.includes('great') || lower.includes('!')) {
      emotion = 'happy';
    } else if (lower.includes('hmm') || lower.includes('let me') || lower.includes('thinking')) {
      emotion = 'thinking';
    }

    return NextResponse.json({
      text: cleanResponse,
      emotion,
    });
  } catch (error) {
    console.error('Assistant API error:', error);
    return NextResponse.json(
      { error: 'Assistant temporarily unavailable' },
      { status: 500 }
    );
  }
}
