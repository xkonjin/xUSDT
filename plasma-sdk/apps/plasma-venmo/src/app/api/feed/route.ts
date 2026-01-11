/**
 * Feed API Route
 * VENMO-006: Implement Real Social Feed
 * 
 * Endpoints:
 * - GET /api/feed - Get activity feed with pagination and privacy filtering
 */

import { NextResponse } from 'next/server';
import { prisma } from '@plasma-pay/db';

/**
 * Format a database activity record into a feed item for the UI
 */
function formatActivityToFeedItem(activity: {
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
}) {
  return {
    id: activity.id,
    type: activity.type,
    user: {
      name: activity.actorName,
      address: activity.actorAddress,
    },
    counterparty: {
      name: activity.targetName,
      address: activity.targetAddress,
    },
    amount: activity.amount.toFixed(2),
    memo: activity.memo,
    timestamp: activity.createdAt.getTime(),
    likes: activity.likes,
    isLiked: false, // TODO: Track per-user likes
    visibility: activity.visibility,
  };
}

/**
 * GET /api/feed
 * 
 * Query parameters:
 * - limit: Number of items to return (default: 20, max: 100)
 * - offset: Number of items to skip (default: 0)
 * - address: Optional user address to include their private activities
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse pagination parameters
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const address = searchParams.get('address');
    
    // Validate limit
    let limit = 20;
    if (limitParam !== null) {
      const parsedLimit = parseInt(limitParam, 10);
      if (isNaN(parsedLimit) || parsedLimit < 0) {
        return NextResponse.json(
          { error: 'Invalid limit parameter' },
          { status: 400 }
        );
      }
      limit = Math.min(parsedLimit, 100); // Cap at 100
    }
    
    // Validate offset
    let offset = 0;
    if (offsetParam !== null) {
      const parsedOffset = parseInt(offsetParam, 10);
      if (isNaN(parsedOffset) || parsedOffset < 0) {
        return NextResponse.json(
          { error: 'Invalid offset parameter' },
          { status: 400 }
        );
      }
      offset = parsedOffset;
    }
    
    // Build where clause based on privacy settings
    let where: object;
    if (address) {
      // Authenticated user: show public + their own activities
      where = {
        OR: [
          { visibility: 'public' },
          { actorAddress: address },
          { targetAddress: address },
        ],
      };
    } else {
      // Unauthenticated: only public activities
      where = { visibility: 'public' };
    }
    
    // Fetch activities with pagination
    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.activity.count({ where }),
    ]);
    
    // Format feed items
    const feed = activities.map(formatActivityToFeedItem);
    
    // Calculate if there are more items
    const hasMore = offset + activities.length < total;
    
    return NextResponse.json({
      success: true,
      feed,
      pagination: {
        limit,
        offset,
        total,
        hasMore,
      },
    });
  } catch (error) {
    console.error('Feed API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feed' },
      { status: 500 }
    );
  }
}
