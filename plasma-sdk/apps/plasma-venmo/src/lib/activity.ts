/**
 * Activity Module
 * VENMO-006: Implement Real Social Feed
 * 
 * Provides activity creation and types for the social feed.
 */

import { prisma } from '@plasma-pay/db';

/**
 * Activity types enum
 */
export const ActivityType = {
  PAYMENT: 'payment',
  CLAIM: 'claim',
  REQUEST: 'request',
} as const;

export type ActivityTypeValue = typeof ActivityType[keyof typeof ActivityType];

/**
 * Visibility levels enum
 */
export const ActivityVisibility = {
  PUBLIC: 'public',
  FRIENDS: 'friends',
  PRIVATE: 'private',
} as const;

export type ActivityVisibilityValue = typeof ActivityVisibility[keyof typeof ActivityVisibility];

/**
 * Input for creating an activity
 */
export interface CreateActivityInput {
  type: ActivityTypeValue;
  actorAddress: string;
  actorName: string;
  targetAddress: string;
  targetName: string;
  amount: number;
  memo?: string;
  txHash?: string;
  visibility: ActivityVisibilityValue;
}

/**
 * Activity record from database
 */
export interface ActivityRecord {
  id: string;
  type: string;
  actorAddress: string;
  actorName: string;
  targetAddress: string;
  targetName: string;
  amount: number;
  currency: string;
  memo: string | null;
  txHash: string | null;
  visibility: string;
  likes: number;
  createdAt: Date;
}

/**
 * Create a new activity in the database
 */
export async function createActivity(input: CreateActivityInput): Promise<ActivityRecord> {
  return prisma.activity.create({
    data: {
      type: input.type,
      actorAddress: input.actorAddress,
      actorName: input.actorName,
      targetAddress: input.targetAddress,
      targetName: input.targetName,
      amount: input.amount,
      currency: 'USDT0',
      memo: input.memo,
      txHash: input.txHash,
      visibility: input.visibility,
    },
  });
}

/**
 * Log a payment activity when a transfer is made
 */
export async function logPaymentActivity(params: {
  fromAddress: string;
  fromName: string;
  toAddress: string;
  toName: string;
  amount: number;
  memo?: string;
  txHash?: string;
  visibility?: ActivityVisibilityValue;
}): Promise<ActivityRecord> {
  return createActivity({
    type: ActivityType.PAYMENT,
    actorAddress: params.fromAddress,
    actorName: params.fromName,
    targetAddress: params.toAddress,
    targetName: params.toName,
    amount: params.amount,
    memo: params.memo,
    txHash: params.txHash,
    visibility: params.visibility || ActivityVisibility.PUBLIC,
  });
}

/**
 * Log a claim activity when a payment is claimed
 */
export async function logClaimActivity(params: {
  claimerAddress: string;
  claimerName: string;
  senderAddress: string;
  senderName: string;
  amount: number;
  memo?: string;
  txHash?: string;
  visibility?: ActivityVisibilityValue;
}): Promise<ActivityRecord> {
  return createActivity({
    type: ActivityType.CLAIM,
    actorAddress: params.claimerAddress,
    actorName: params.claimerName,
    targetAddress: params.senderAddress,
    targetName: params.senderName,
    amount: params.amount,
    memo: params.memo,
    txHash: params.txHash,
    visibility: params.visibility || ActivityVisibility.PUBLIC,
  });
}

/**
 * Log a request activity when a payment request is created
 */
export async function logRequestActivity(params: {
  fromAddress: string;
  fromName: string;
  toAddress: string;
  toName: string;
  amount: number;
  memo?: string;
  visibility?: ActivityVisibilityValue;
}): Promise<ActivityRecord> {
  return createActivity({
    type: ActivityType.REQUEST,
    actorAddress: params.fromAddress,
    actorName: params.fromName,
    targetAddress: params.toAddress,
    targetName: params.toName,
    amount: params.amount,
    memo: params.memo,
    visibility: params.visibility || ActivityVisibility.PRIVATE,
  });
}
