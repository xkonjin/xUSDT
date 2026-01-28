import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, type FunctionDeclaration, SchemaType } from '@google/generative-ai';

// Server-side only - no NEXT_PUBLIC prefix
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

// Function declarations for Gemini function calling
const functionDeclarations: FunctionDeclaration[] = [
  {
    name: 'check_balance',
    description: 'Get the current USDC balance for the connected wallet',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
      required: [],
    },
  },
  {
    name: 'send_money',
    description: 'Send USDC to a recipient. Requires user confirmation before executing.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        recipient: {
          type: SchemaType.STRING,
          description: 'Email address or wallet address of the recipient',
        },
        amount: {
          type: SchemaType.NUMBER,
          description: 'Amount in USD to send (e.g., 20 for $20)',
        },
      },
      required: ['recipient', 'amount'],
    },
  },
  {
    name: 'create_payment_link',
    description: 'Create a payment request link that can be shared with others',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        amount: {
          type: SchemaType.NUMBER,
          description: 'Optional: Amount in USD to request',
        },
        memo: {
          type: SchemaType.STRING,
          description: 'Optional: Note or description for the payment request',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_transactions',
    description: 'Get recent transaction history',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        limit: {
          type: SchemaType.NUMBER,
          description: 'Number of transactions to return (default: 5, max: 20)',
        },
      },
      required: [],
    },
  },
];

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

## AVAILABLE ACTIONS (use function calls when appropriate)
- check_balance: When user asks about their balance
- send_money: When user wants to send money (ALWAYS ask for confirmation first)
- create_payment_link: When user wants to create a payment request
- get_transactions: When user asks about transaction history

## RULES
1. NEVER make up features that don't exist
2. NEVER share sensitive info or private keys
3. Always be encouraging about security
4. If unsure, say "I'm not sure, but I can help you find out!"
5. Celebrate successes enthusiastically
6. Be empathetic about errors - reassure funds are safe
7. For send_money: ALWAYS confirm with user before executing
8. Use function calls for balance, send, payment links, and transactions`;

// Execute function calls based on context
function executeFunctionCall(
  functionName: string,
  args: Record<string, unknown>,
  context: {
    balance?: string;
    walletConnected?: boolean;
    transactions?: Array<{ to: string; amount: string; date: string; status: string }>;
  }
): { result: unknown; needsConfirmation?: boolean; action?: string } {
  switch (functionName) {
    case 'check_balance': {
      if (!context.walletConnected) {
        return { result: { error: 'Wallet not connected', balance: null } };
      }
      return { result: { balance: context.balance || '0.00', currency: 'USDC' } };
    }

    case 'send_money': {
      const { recipient, amount } = args as { recipient: string; amount: number };
      if (!context.walletConnected) {
        return { result: { error: 'Wallet not connected. Please connect your wallet first.' } };
      }
      const currentBalance = parseFloat(context.balance || '0');
      if (amount > currentBalance) {
        return { result: { error: `Insufficient balance. You have $${currentBalance.toFixed(2)} USDC.` } };
      }
      if (amount < 0.01) {
        return { result: { error: 'Minimum send amount is $0.01' } };
      }
      if (amount > 10000) {
        return { result: { error: 'Maximum send amount is $10,000' } };
      }
      // Return confirmation needed - don't execute yet
      return {
        result: {
          status: 'pending_confirmation',
          recipient,
          amount,
          message: `Ready to send $${amount.toFixed(2)} to ${recipient}`,
        },
        needsConfirmation: true,
        action: 'send_money',
      };
    }

    case 'create_payment_link': {
      const { amount, memo } = args as { amount?: number; memo?: string };
      if (!context.walletConnected) {
        return { result: { error: 'Wallet not connected. Please connect your wallet first.' } };
      }
      // Generate a mock payment link (in production, this would call your backend)
      const linkId = Math.random().toString(36).substring(2, 10);
      const link = `https://plenmo.app/pay/${linkId}`;
      return {
        result: {
          status: 'created',
          link,
          amount: amount || null,
          memo: memo || null,
          message: amount
            ? `Payment link created for $${amount.toFixed(2)}${memo ? `: "${memo}"` : ''}`
            : 'Payment link created (open amount)',
        },
        action: 'create_payment_link',
      };
    }

    case 'get_transactions': {
      const { limit = 5 } = args as { limit?: number };
      if (!context.walletConnected) {
        return { result: { error: 'Wallet not connected. Please connect your wallet first.' } };
      }
      const txLimit = Math.min(Math.max(1, limit), 20);
      // Use context transactions or return empty
      const transactions = context.transactions?.slice(0, txLimit) || [];
      return {
        result: {
          transactions,
          count: transactions.length,
          message: transactions.length > 0
            ? `Found ${transactions.length} recent transaction${transactions.length > 1 ? 's' : ''}`
            : 'No transactions yet',
        },
      };
    }

    default:
      return { result: { error: `Unknown function: ${functionName}` } };
  }
}

export async function POST(request: Request) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Assistant not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { message, context, history, confirmAction } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Handle action confirmation (e.g., user confirmed send_money)
    if (confirmAction) {
      const { action, params, confirmed } = confirmAction;
      if (action === 'send_money' && confirmed) {
        // In production, this would call your actual send endpoint
        return NextResponse.json({
          text: `🎉 Sent $${params.amount.toFixed(2)} to ${params.recipient}!`,
          emotion: 'excited',
          actionExecuted: {
            action: 'send_money',
            params,
            status: 'completed',
          },
        });
      } else if (!confirmed) {
        return NextResponse.json({
          text: 'No problem, I cancelled that transfer. 👍',
          emotion: 'neutral',
        });
      }
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      tools: [{ functionDeclarations }],
    });

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

## INSTRUCTIONS
If the user is asking about balance, sending money, payment links, or transactions, use the appropriate function call.
Otherwise, respond helpfully in 1-2 SHORT sentences (under 100 characters preferred).`;

    const result = await model.generateContent(prompt);
    const response = result.response;

    // Check for function calls
    const functionCalls = response.functionCalls();

    if (functionCalls && functionCalls.length > 0) {
      const functionCall = functionCalls[0]; // Handle first function call
      const functionResult = executeFunctionCall(
        functionCall.name,
        functionCall.args as Record<string, unknown>,
        context || {}
      );

      // If needs confirmation, return with pending action
      if (functionResult.needsConfirmation) {
        const args = functionCall.args as { recipient: string; amount: number };
        return NextResponse.json({
          text: `Send $${args.amount.toFixed(2)} to ${args.recipient}? 💸`,
          emotion: 'thinking',
          pendingAction: {
            action: functionResult.action,
            params: functionCall.args,
          },
        });
      }

      // Return function result with natural language
      const resultData = functionResult.result as Record<string, unknown>;

      if (resultData.error) {
        return NextResponse.json({
          text: `${resultData.error}`,
          emotion: 'concerned',
        });
      }

      // Generate natural response based on function result
      let responseText = '';
      let emotion = 'neutral';

      switch (functionCall.name) {
        case 'check_balance':
          responseText = `Your balance is $${resultData.balance} USDC 💰`;
          emotion = 'happy';
          break;
        case 'create_payment_link':
          responseText = `${resultData.message}`;
          emotion = 'excited';
          break;
        case 'get_transactions':
          responseText = `${resultData.message}`;
          emotion = resultData.count ? 'neutral' : 'thinking';
          break;
        default:
          responseText = JSON.stringify(resultData);
      }

      return NextResponse.json({
        text: responseText,
        emotion,
        functionResult: {
          name: functionCall.name,
          data: resultData,
        },
      });
    }

    // No function call - return text response
    let cleanResponse = response.text().trim()
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Assistant temporarily unavailable', debug: errorMessage },
      { status: 500 }
    );
  }
}
