/**
 * Bills API
 *
 * Handles creating and listing bills.
 *
 * Endpoints:
 * - POST /api/bills - Create a new bill
 * - GET /api/bills - List bills for a user
 */

import { NextResponse } from "next/server";
import { prisma } from "@plasma-pay/db";
import {
  validateBillCreate,
  ValidationError,
  type BillCreateInput,
  type BillItem,
  type BillParticipant,
} from "@/lib/validation";

/**
 * POST /api/bills
 *
 * Creates a new bill with items and participants.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate and sanitize input
    let validatedData: BillCreateInput;
    try {
      validatedData = validateBillCreate(body);
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json(
          { error: error.message, errors: error.errors },
          { status: 400 }
        );
      }
      throw error;
    }

    const {
      creatorAddress,
      title,
      items,
      participants,
      subtotal,
      tax,
      taxPercent,
      tip,
      tipPercent,
      total,
    } = validatedData;

    // Create bill with items and participants in a transaction
    const bill = await prisma.bill.create({
      data: {
        creatorAddress,
        title,
        subtotal: subtotal || 0,
        tax: tax || 0,
        taxPercent: taxPercent || 0,
        tip: tip || 0,
        tipPercent: tipPercent || 0,
        total: total || 0,
        currency: "USDT0",
        status: "draft",
        items: {
          create: items.map((item: BillItem) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity || 1,
          })),
        },
        participants: {
          create: participants.map((p: BillParticipant) => ({
            name: p.name,
            email: p.email,
            phone: p.phone,
            color: p.color,
            share: 0, // Will be calculated
          })),
        },
      },
      include: {
        items: true,
        participants: true,
      },
    });

    // Create a map for item ID lookup (new IDs from database)
    const itemIdMap: Record<string, string> = {};
    items.forEach((origItem: BillItem, index: number) => {
      if (origItem.id) itemIdMap[origItem.id] = bill.items[index].id;
    });

    // Create a map for participant ID lookup
    const participantIdMap: Record<string, string> = {};
    participants.forEach((origP: BillParticipant, index: number) => {
      if (origP.id) participantIdMap[origP.id] = bill.participants[index].id;
    });

    // Create item assignments
    const assignments: { itemId: string; participantId: string }[] = [];
    items.forEach((origItem: BillItem) => {
      if (origItem.assignedToParticipantIds && origItem.id) {
        origItem.assignedToParticipantIds.forEach((origPid: string) => {
          const newItemId = itemIdMap[origItem.id!];
          const newPid = participantIdMap[origPid];
          if (newItemId && newPid) {
            assignments.push({ itemId: newItemId, participantId: newPid });
          }
        });
      }
    });

    if (assignments.length > 0) {
      await prisma.billItemAssignment.createMany({
        data: assignments,
      });
    }

    // Calculate shares for each participant
    const participantShares: Record<string, number> = {};
    bill.participants.forEach((p) => {
      participantShares[p.id] = 0;
    });

    // Count assignments per item and distribute cost
    for (const origItem of items) {
      const assignedPids = (origItem.assignedToParticipantIds || [])
        .map((origPid: string) => participantIdMap[origPid])
        .filter(Boolean);

      if (assignedPids.length > 0) {
        const itemTotal = origItem.price * (origItem.quantity || 1);
        const perPerson = itemTotal / assignedPids.length;
        assignedPids.forEach((pid: string) => {
          participantShares[pid] = (participantShares[pid] || 0) + perPerson;
        });
      }
    }

    // Add proportional tax and tip to each participant's share
    const totalItems = bill.items.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );
    if (totalItems > 0) {
      const taxRatio = (tax || 0) / totalItems;
      const tipRatio = (tip || 0) / totalItems;

      for (const pid of Object.keys(participantShares)) {
        const itemsShare = participantShares[pid];
        participantShares[pid] =
          itemsShare + itemsShare * taxRatio + itemsShare * tipRatio;
      }
    }

    // Update participant shares in database
    await Promise.all(
      Object.entries(participantShares).map(([pid, share]) =>
        prisma.billParticipant.update({
          where: { id: pid },
          data: { share: Math.round(share * 100) / 100 },
        })
      )
    );

    // Activate the bill
    await prisma.bill.update({
      where: { id: bill.id },
      data: { status: "active" },
    });

    // Fetch updated bill
    const updatedBill = await prisma.bill.findUnique({
      where: { id: bill.id },
      include: {
        items: { include: { assignments: true } },
        participants: { include: { assignments: true } },
      },
    });

    return NextResponse.json({
      success: true,
      bill: updatedBill,
    });
  } catch (error) {
    console.error("Create bill error:", error);
    return NextResponse.json(
      { error: "Failed to create bill" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/bills
 *
 * Lists bills for a creator.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "address query parameter is required" },
        { status: 400 }
      );
    }

    const bills = await prisma.bill.findMany({
      where: { creatorAddress: address },
      include: { participants: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      bills: bills.map((bill) => ({
        id: bill.id,
        title: bill.title,
        total: bill.total,
        status: bill.status,
        participantCount: bill.participants.length,
        paidCount: bill.participants.filter((p) => p.paid).length,
        createdAt: bill.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("List bills error:", error);
    return NextResponse.json(
      { error: "Failed to list bills" },
      { status: 500 }
    );
  }
}
