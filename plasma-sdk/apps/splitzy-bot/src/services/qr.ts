/**
 * QR Code Service
 * 
 * Generates QR codes for payment links.
 * Each participant gets a unique QR code they can scan to pay.
 */

import QRCode from 'qrcode';
import type { PaymentQRCode, PaymentIntent, BillParticipant } from '../types.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Base URL for payment pages
 * Should point to the bill-split app's payment page
 */
const PAYMENT_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://splitzy.app';

/**
 * QR code generation options
 * Optimized for readability and Telegram display
 */
const QR_OPTIONS: QRCode.QRCodeToBufferOptions = {
  type: 'png',
  width: 400,              // Good size for Telegram
  margin: 2,               // Minimal margin
  errorCorrectionLevel: 'M', // Medium error correction
  color: {
    dark: '#000000',       // Black QR code
    light: '#FFFFFF',      // White background
  },
};

// ============================================================================
// QR CODE GENERATION
// ============================================================================

/**
 * Generates a payment URL for a given payment intent
 * 
 * @param intentId - The payment intent ID
 * @returns Full payment URL
 */
export function getPaymentUrl(intentId: string): string {
  return `${PAYMENT_BASE_URL}/pay/${intentId}`;
}

/**
 * Generates a QR code for a payment URL
 * 
 * @param paymentUrl - The payment URL to encode
 * @returns QR code as PNG buffer
 */
export async function generateQRCode(paymentUrl: string): Promise<Buffer> {
  return QRCode.toBuffer(paymentUrl, QR_OPTIONS);
}

/**
 * Generates QR codes for all payment intents
 * 
 * @param paymentIntents - Array of payment intents (one per participant)
 * @param participants - Array of participants (for labels)
 * @returns Array of PaymentQRCode objects
 */
export async function generatePaymentQRCodes(
  paymentIntents: PaymentIntent[],
  participants: BillParticipant[]
): Promise<PaymentQRCode[]> {
  const qrCodes: PaymentQRCode[] = [];
  
  for (let i = 0; i < paymentIntents.length; i++) {
    const intent = paymentIntents[i];
    const participant = participants[i];
    
    if (!intent || !participant) continue;
    
    // Generate payment URL
    const paymentUrl = getPaymentUrl(intent.id);
    
    // Generate QR code
    const qrCodeBuffer = await generateQRCode(paymentUrl);
    
    qrCodes.push({
      label: participant.name,
      amount: participant.share,
      paymentUrl,
      qrCodeBuffer,
    });
  }
  
  return qrCodes;
}

/**
 * Generates a styled QR code with branding (optional enhancement)
 * For now, uses standard QR codes
 * 
 * @param paymentUrl - The payment URL to encode
 * @param label - Participant name for the label
 * @param amount - Amount to display
 * @returns QR code as PNG buffer
 */
export async function generateStyledQRCode(
  paymentUrl: string,
  label: string,
  amount: number
): Promise<Buffer> {
  // For now, just use standard QR code
  // Future: Add logo overlay, branded colors, amount text
  return generateQRCode(paymentUrl);
}

/**
 * Generates a combined QR code image with multiple participants
 * Useful for displaying all QR codes in a single image
 * 
 * @param paymentIntents - Array of payment intents
 * @param participants - Array of participants
 * @returns Combined image as PNG buffer
 */
export async function generateCombinedQRImage(
  paymentIntents: PaymentIntent[],
  participants: BillParticipant[]
): Promise<Buffer> {
  // For MVP, just return individual QR codes
  // Future: Create a grid image with all QR codes
  const firstIntent = paymentIntents[0];
  if (!firstIntent) {
    throw new Error('No payment intents provided');
  }
  return generateQRCode(getPaymentUrl(firstIntent.id));
}

