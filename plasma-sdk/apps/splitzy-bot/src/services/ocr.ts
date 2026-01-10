/**
 * OCR Service
 * 
 * Uses OpenAI Vision API to extract items from receipt images.
 * Ported from the bill-split app's scan-receipt route.
 */

import OpenAI from 'openai';
import type { ReceiptScanResult, ScannedItem } from '../types.js';
import { nanoid } from 'nanoid';

// ============================================================================
// OPENAI CLIENT
// ============================================================================

let openaiClient: OpenAI | null = null;

/**
 * Get or create OpenAI client (lazy initialization)
 */
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// ============================================================================
// RECEIPT SCANNING
// ============================================================================

/**
 * System prompt for receipt scanning
 * Instructs the AI to extract structured data from receipt images
 */
const SYSTEM_PROMPT = `You are a receipt scanner. Extract items, prices, and totals from receipt images.

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
- Return only valid JSON, no markdown
- Be conservative with confidence - if text is blurry or unclear, lower the score`;

/**
 * Scans a receipt image and extracts items
 * 
 * @param imageUrl - URL of the image to scan (can be Telegram file URL or data URL)
 * @returns Extracted receipt data or null if extraction fails
 */
export async function scanReceipt(imageUrl: string): Promise<ReceiptScanResult | null> {
  try {
    const openai = getOpenAI();
    
    // Prepare image URL (Telegram files need to be base64 encoded)
    let imageContent: string;
    if (imageUrl.startsWith('https://api.telegram.org')) {
      // Fetch and convert to base64
      const response = await fetch(imageUrl);
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const mimeType = response.headers.get('content-type') || 'image/jpeg';
      imageContent = `data:${mimeType};base64,${base64}`;
    } else {
      imageContent = imageUrl;
    }
    
    // Call OpenAI Vision API
    const completion = await openai.chat.completions.create({
      // Using gpt-4o-mini for cost efficiency - upgrade to gpt-4o for better accuracy
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: imageContent,
                detail: 'high', // Use high detail for better OCR
              },
            },
            {
              type: 'text',
              text: 'Please extract all items and totals from this receipt.',
            },
          ],
        },
      ],
      max_tokens: 1500,
      temperature: 0.1, // Low temperature for more consistent extraction
    });
    
    // Parse response
    const content = completion.choices[0]?.message?.content || '{}';
    
    // Try to extract JSON from the response
    let result: ReceiptScanResult;
    try {
      // Handle markdown code blocks
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                        content.match(/```\n?([\s\S]*?)\n?```/) ||
                        [null, content];
      result = JSON.parse(jsonMatch[1] || content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      return null;
    }
    
    // Validate result
    if (!result.items || !Array.isArray(result.items)) {
      console.error('Invalid receipt scan result - no items array');
      return null;
    }
    
    // Ensure all items have required fields including id
    result.items = result.items.map((item): ScannedItem => ({
      id: nanoid(8),
      name: String(item.name || 'Unknown Item'),
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 1,
    }));
    
    // Set default confidence if not provided
    result.confidence = Number(result.confidence) || 0.8;
    
    return result;
    
  } catch (error) {
    console.error('Receipt scan error:', error);
    return null;
  }
}

/**
 * Mock receipt scan for testing without OpenAI
 * Returns sample data for development
 */
export function mockScanReceipt(): ReceiptScanResult {
  return {
    items: [
      { id: nanoid(8), name: 'Burger', price: 12.99, quantity: 1 },
      { id: nanoid(8), name: 'Fries', price: 4.99, quantity: 1 },
      { id: nanoid(8), name: 'Drink', price: 2.99, quantity: 2 },
      { id: nanoid(8), name: 'Salad', price: 8.50, quantity: 1 },
    ],
    subtotal: 32.46,
    tax: 2.92,
    taxPercent: 9,
    total: 35.38,
    merchant: 'Sample Restaurant',
    confidence: 0.95,
  };
}

