/**
 * Contacts API Route
 * VENMO-007: Add Friend/Contact System
 * 
 * Endpoints:
 * - GET /api/contacts - List user's contacts
 * - POST /api/contacts - Add new contact
 */

import { NextResponse } from 'next/server';
import { prisma } from '@plasma-pay/db';
import { checkRateLimit, rateLimitResponse, validateAddress } from '@/lib/api-utils';
import { RATE_LIMIT_CONFIGS } from '@/lib/rate-limiter';

// Validation helpers
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string): boolean {
  return /^\+?[\d\s\-()]{10,}$/.test(phone);
}

/**
 * GET /api/contacts
 * 
 * Query parameters:
 * - address: Owner wallet address (required)
 * - q: Search query (optional)
 * - favorites: Filter to favorites only (optional, 'true' or 'false')
 * - limit: Number of items to return (default: 100, max: 500)
 * - offset: Number of items to skip (default: 0)
 */
export async function GET(request: Request) {
  // Rate limiting
  const { allowed, retryAfter } = checkRateLimit(request, RATE_LIMIT_CONFIGS.read);
  if (!allowed && retryAfter) {
    return rateLimitResponse(retryAfter);
  }

  try {
    const { searchParams } = new URL(request.url);
    
    // Get and validate address parameter
    const address = searchParams.get('address');
    const addressValidation = validateAddress(address);
    if (!addressValidation.valid) {
      return NextResponse.json(
        { error: addressValidation.error || 'Invalid address' },
        { status: 400 }
      );
    }
    const normalizedAddress = addressValidation.normalized!;
    
    // Parse optional parameters
    const search = searchParams.get('q') || undefined;
    const favoritesOnly = searchParams.get('favorites') === 'true';
    
    // Parse pagination
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    
    let limit = 100;
    if (limitParam !== null) {
      const parsedLimit = parseInt(limitParam, 10);
      if (isNaN(parsedLimit) || parsedLimit < 0) {
        return NextResponse.json(
          { error: 'Invalid limit parameter' },
          { status: 400 }
        );
      }
      limit = Math.min(parsedLimit, 500);
    }
    
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
    
    // Build where clause
    interface WhereClause {
      ownerAddress: string;
      isFavorite?: boolean;
      OR?: Array<{
        name?: { contains: string };
        email?: { contains: string };
        phone?: { contains: string };
      }>;
    }
    
    const where: WhereClause = { ownerAddress: normalizedAddress };
    
    if (favoritesOnly) {
      where.isFavorite = true;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }
    
    // Fetch contacts with pagination
    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: [
          { isFavorite: 'desc' },
          { lastPayment: 'desc' },
          { name: 'asc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.contact.count({ where }),
    ]);
    
    return NextResponse.json({
      success: true,
      contacts,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + contacts.length < total,
      },
    });
  } catch (error) {
    console.error('Contacts GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contacts
 * 
 * Request body:
 * - ownerAddress: Wallet address of the owner (required)
 * - contactAddress: Wallet address of the contact (optional if email/phone provided)
 * - name: Display name for the contact (required)
 * - email: Contact's email (optional)
 * - phone: Contact's phone (optional)
 * - isFavorite: Whether to mark as favorite (optional, default: false)
 */
export async function POST(request: Request) {
  // Rate limiting
  const { allowed, retryAfter } = checkRateLimit(request, RATE_LIMIT_CONFIGS.payment);
  if (!allowed && retryAfter) {
    return rateLimitResponse(retryAfter);
  }

  try {
    const body = await request.json();
    const { ownerAddress, contactAddress, name, email, phone, isFavorite } = body;
    
    // Validate owner address
    const ownerValidation = validateAddress(ownerAddress);
    if (!ownerValidation.valid) {
      return NextResponse.json(
        { error: ownerValidation.error || 'Invalid owner address' },
        { status: 400 }
      );
    }
    const normalizedOwnerAddress = ownerValidation.normalized!;
    
    if (!contactAddress && !email && !phone) {
      return NextResponse.json(
        { error: 'contactAddress, email, or phone is required' },
        { status: 400 }
      );
    }
    
    // Validate contact address if provided
    let normalizedContactAddress: string | undefined;
    if (contactAddress) {
      const contactValidation = validateAddress(contactAddress);
      if (!contactValidation.valid) {
        return NextResponse.json(
          { error: contactValidation.error || 'Invalid contact address' },
          { status: 400 }
        );
      }
      normalizedContactAddress = contactValidation.normalized;
    }
    
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }
    
    if (name.length > 100) {
      return NextResponse.json(
        { error: 'name must be 100 characters or less' },
        { status: 400 }
      );
    }
    
    if (email && !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    if (phone && !isValidPhone(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone format' },
        { status: 400 }
      );
    }
    
    // Check for existing contact with same address
    if (normalizedContactAddress) {
      const existing = await prisma.contact.findUnique({
        where: {
          ownerAddress_contactAddress: {
            ownerAddress: normalizedOwnerAddress,
            contactAddress: normalizedContactAddress,
          },
        },
      });
      
      if (existing) {
        return NextResponse.json(
          { error: 'Contact with this address already exists' },
          { status: 409 }
        );
      }
    }
    
    // Create contact
    const contact = await prisma.contact.create({
      data: {
        ownerAddress: normalizedOwnerAddress,
        contactAddress: normalizedContactAddress || null,
        name: name.trim(),
        email: email || null,
        phone: phone || null,
        isFavorite: isFavorite || false,
      },
    });
    
    return NextResponse.json({
      success: true,
      contact,
    }, { status: 201 });
  } catch (error) {
    console.error('Contacts POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    );
  }
}
