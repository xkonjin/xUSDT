/**
 * Receipt Scanning API
 * 
 * Uses OpenAI Vision to extract items from a receipt image.
 */

import { NextResponse } from 'next/server';

// Lazy-load OpenAI client to avoid build-time errors
async function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  
  const { default: OpenAI } = await import('openai');
  return new OpenAI({ apiKey });
}

/**
 * POST /api/scan-receipt
 * 
 * Scans a receipt image and extracts items.
 * 
 * Request body:
 * - image: Base64-encoded image data
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json(
        { error: 'image is required' },
        { status: 400 }
      );
    }

    // Initialize OpenAI client
    let openai;
    try {
      openai = await getOpenAIClient();
    } catch {
      // Return mock data if OpenAI is not configured (dev mode)
      console.log('OpenAI not configured, returning mock data');
      return NextResponse.json({
        success: true,
        items: [
          { name: 'Burger', price: 12.99, quantity: 1 },
          { name: 'Fries', price: 4.99, quantity: 1 },
          { name: 'Drink', price: 2.99, quantity: 1 },
        ],
        subtotal: 20.97,
        tax: 1.89,
        taxPercent: 9,
        total: 22.86,
        merchant: 'Sample Restaurant',
        confidence: 0.95,
      });
    }

    // Call OpenAI Vision API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a receipt scanner. Extract items, prices, and totals from receipt images.
          
Return a JSON object with:
- items: array of {name: string, price: number, quantity: number}
- subtotal: number (optional)
- tax: number (optional)
- taxPercent: number (optional)
- tip: number (optional)
- tipPercent: number (optional)
- total: number (optional)
- merchant: string (restaurant/store name, optional)
- date: string (ISO date, optional)
- confidence: number (0-1, how confident you are in the extraction)

Important:
- All prices should be numbers (e.g., 12.99 not "$12.99")
- Default quantity to 1 if not specified
- If you can't read something clearly, omit it
- Return only valid JSON, no markdown`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`,
              },
            },
            {
              type: 'text',
              text: 'Please extract all items and totals from this receipt.',
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    // Parse the response
    const content = response.choices[0]?.message?.content || '{}';
    
    // Try to extract JSON from the response
    let parsedResult;
    try {
      // Remove markdown code blocks if present
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                        content.match(/```\n?([\s\S]*?)\n?```/) ||
                        [null, content];
      parsedResult = JSON.parse(jsonMatch[1] || content);
    } catch {
      console.error('Failed to parse OpenAI response:', content);
      return NextResponse.json(
        { error: 'Failed to parse receipt' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      ...parsedResult,
    });
  } catch (error) {
    console.error('Scan receipt error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to scan receipt' },
      { status: 500 }
    );
  }
}

