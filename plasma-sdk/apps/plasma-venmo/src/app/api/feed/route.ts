/**
 * Feed API Route
 * VENMO-006: Implement Real Social Feed
 * 
 * Endpoints:
 * - GET /api/feed - Get activity feed with pagination and privacy filtering
 * - POST /api/feed - Like/unlike an activity
 */

import { NextResponse } from 'next/server';
import { prisma } from '@plasma-pay/db';

// ============================================================================
// IN-MEMORY LIKES TRACKING
// ============================================================================

/**
 * In-memory store for user likes
 * Key: `${userAddress}:${activityId}`
 * Value: true (liked)
 * 
 * Note: This will reset on server restart. For production,
 * consider adding a UserLike model to the database.
 */
const userLikesStore = new Map<string, boolean>();

/**
 * Get the like key for a user-activity pair
 */
function getLikeKey(userAddress: string, activityId: string): string {
  return `${userAddress.toLowerCase()}:${activityId}`;
}

/**
 * Check if a user has liked an activity
 */
function hasUserLiked(userAddress: string, activityId: string): boolean {
  return userLikesStore.get(getLikeKey(userAddress, activityId)) ?? false;
}

/**
 * Toggle a user's like on an activity
 * Returns the new like state (true = liked, false = unliked)
 */
function toggleUserLike(userAddress: string, activityId: string): boolean {
  const key = getLikeKey(userAddress, activityId);
  const currentlyLiked = userLikesStore.get(key) ?? false;
  const newState = !currentlyLiked;
  
  if (newState) {
    userLikesStore.set(key, true);
  } else {
    userLikesStore.delete(key);
  }
  
  return newState;
}

/**
 * Format a database activity record into a feed item for the UI
 */
function formatActivityToFeedItem(
  activity: {
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
  },
  userAddress?: string | null
) {
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
    isLiked: userAddress ? hasUserLiked(userAddress, activity.id) : false,
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
    
    // Format feed items with per-user like status
    const feed = activities.map(activity => formatActivityToFeedItem(activity, address));
    
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

/**
 * POST /api/feed
 * 
 * Like or unlike an activity
 * 
 * Body:
 * - activityId: ID of the activity to like/unlike
 * - userAddress: Address of the user performing the action
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { activityId, userAddress } = body;
    
    // Validate required fields
    if (!activityId || !userAddress) {
      return NextResponse.json(
        { error: 'activityId and userAddress are required' },
        { status: 400 }
      );
    }
    
    // Validate that activity exists
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
    });
    
    if (!activity) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }
    
    // Toggle the like state
    const wasLiked = hasUserLiked(userAddress, activityId);
    const isNowLiked = toggleUserLike(userAddress, activityId);
    
    // Update the like count in the database
    const newLikeCount = await prisma.activity.update({
      where: { id: activityId },
      data: {
        likes: {
          increment: isNowLiked ? 1 : -1,
        },
      },
      select: { likes: true },
    });
    
    console.log(
      `User ${userAddress.slice(0, 8)}... ${isNowLiked ? 'liked' : 'unliked'} activity ${activityId}`
    );
    
    return NextResponse.json({
      success: true,
      activityId,
      isLiked: isNowLiked,
      likes: Math.max(0, newLikeCount.likes), // Ensure non-negative
    });
  } catch (error) {
    console.error('Like API error:', error);
    return NextResponse.json(
      { error: 'Failed to process like' },
      { status: 500 }
    );
  }
}
