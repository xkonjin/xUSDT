/**
 * Contacts API Route - Individual Contact Operations
 * VENMO-007: Add Friend/Contact System
 * 
 * Endpoints:
 * - GET /api/contacts/[id] - Get single contact
 * - PATCH /api/contacts/[id] - Update contact
 * - DELETE /api/contacts/[id] - Delete contact
 */

import { NextResponse } from 'next/server';
import { prisma } from '@plasma-pay/db';

// Validation helpers
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string): boolean {
  return /^\+?[\d\s\-()]{10,}$/.test(phone);
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/contacts/[id]
 * 
 * Get a single contact by ID
 */
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    
    const contact = await prisma.contact.findUnique({
      where: { id },
    });
    
    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      contact,
    });
  } catch (error) {
    console.error('Contact GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/contacts/[id]
 * 
 * Update a contact
 * 
 * Request body (all optional):
 * - name: Display name
 * - email: Contact email
 * - phone: Contact phone
 * - isFavorite: Favorite status
 */
export async function PATCH(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, email, phone, isFavorite } = body;
    
    // Check if contact exists
    const existing = await prisma.contact.findUnique({
      where: { id },
    });
    
    if (!existing) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }
    
    // Validate fields
    if (name !== undefined) {
      if (name.trim().length === 0) {
        return NextResponse.json(
          { error: 'name cannot be empty' },
          { status: 400 }
        );
      }
      if (name.length > 100) {
        return NextResponse.json(
          { error: 'name must be 100 characters or less' },
          { status: 400 }
        );
      }
    }
    
    if (email !== undefined && email !== '' && !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    if (phone !== undefined && phone !== '' && !isValidPhone(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone format' },
        { status: 400 }
      );
    }
    
    if (isFavorite !== undefined && typeof isFavorite !== 'boolean') {
      return NextResponse.json(
        { error: 'isFavorite must be a boolean' },
        { status: 400 }
      );
    }
    
    // Build update data
    const updateData: {
      name?: string;
      email?: string | null;
      phone?: string | null;
      isFavorite?: boolean;
    } = {};
    
    if (name !== undefined) {
      updateData.name = name.trim();
    }
    if (email !== undefined) {
      updateData.email = email || null;
    }
    if (phone !== undefined) {
      updateData.phone = phone || null;
    }
    if (isFavorite !== undefined) {
      updateData.isFavorite = isFavorite;
    }
    
    // Update contact
    const contact = await prisma.contact.update({
      where: { id },
      data: updateData,
    });
    
    return NextResponse.json({
      success: true,
      contact,
    });
  } catch (error) {
    console.error('Contact PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update contact' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/contacts/[id]
 * 
 * Delete a contact
 */
export async function DELETE(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    
    // Check if contact exists
    const existing = await prisma.contact.findUnique({
      where: { id },
    });
    
    if (!existing) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }
    
    // Delete contact
    await prisma.contact.delete({
      where: { id },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Contact deleted',
    });
  } catch (error) {
    console.error('Contact DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete contact' },
      { status: 500 }
    );
  }
}
