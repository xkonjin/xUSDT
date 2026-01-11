/**
 * Share Calculation Module
 * 
 * Calculates participant shares for bill splitting.
 * Handles proportional distribution of tax and tip.
 */

// =============================================================================
// Types
// =============================================================================

export interface BillItem {
  id: string;
  price: number;
  quantity: number;
  assignedToParticipantIds: string[];
}

export interface Participant {
  id: string;
  name: string;
}

export interface ShareResult {
  [participantId: string]: number;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Round to 2 decimal places for currency.
 */
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

// =============================================================================
// Share Calculation Functions
// =============================================================================

/**
 * Calculate a participant's share of a single item.
 * 
 * @param item - Bill item
 * @param participantId - Participant to calculate for
 * @returns Share amount (0 if not assigned)
 */
export function calculateItemShare(item: BillItem, participantId: string): number {
  const { price, quantity, assignedToParticipantIds } = item;
  
  // Return 0 if participant not assigned to this item
  if (!assignedToParticipantIds.includes(participantId)) {
    return 0;
  }
  
  // Return 0 if no one is assigned
  if (assignedToParticipantIds.length === 0) {
    return 0;
  }
  
  const itemTotal = price * quantity;
  const share = itemTotal / assignedToParticipantIds.length;
  
  return roundCurrency(share);
}

/**
 * Calculate a participant's total share including tax and tip.
 * 
 * @param participantId - Participant to calculate for
 * @param items - All bill items
 * @param tax - Tax amount
 * @param tip - Tip amount
 * @param subtotal - Bill subtotal (sum of all items)
 * @returns Total share amount
 */
export function calculateParticipantShare(
  participantId: string,
  items: BillItem[],
  tax: number,
  tip: number,
  subtotal: number
): number {
  // Calculate items share
  let itemsShare = 0;
  for (const item of items) {
    itemsShare += calculateItemShare(item, participantId);
  }
  
  // Calculate proportional tax and tip
  let taxShare = 0;
  let tipShare = 0;
  
  if (subtotal > 0) {
    const proportion = itemsShare / subtotal;
    taxShare = tax * proportion;
    tipShare = tip * proportion;
  }
  
  return roundCurrency(itemsShare + taxShare + tipShare);
}

/**
 * Calculate shares for all participants.
 * 
 * @param items - All bill items
 * @param participants - All participants
 * @param subtotal - Bill subtotal
 * @param tax - Tax amount
 * @param tip - Tip amount
 * @returns Map of participant ID to share amount
 */
export function calculateAllShares(
  items: BillItem[],
  participants: Participant[],
  subtotal: number,
  tax: number,
  tip: number
): ShareResult {
  const shares: ShareResult = {};
  
  for (const participant of participants) {
    shares[participant.id] = calculateParticipantShare(
      participant.id,
      items,
      tax,
      tip,
      subtotal
    );
  }
  
  return shares;
}

/**
 * Verify that shares sum to total (within rounding tolerance).
 * 
 * @param shares - Calculated shares
 * @param total - Expected total
 * @param tolerance - Allowed difference (default: 0.02)
 * @returns True if shares sum correctly
 */
export function verifySharesTotal(
  shares: ShareResult,
  total: number,
  tolerance = 0.02
): boolean {
  const sum = Object.values(shares).reduce((acc, val) => acc + val, 0);
  return Math.abs(sum - total) <= tolerance;
}
