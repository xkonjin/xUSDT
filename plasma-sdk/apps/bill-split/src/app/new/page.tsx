"use client";

/**
 * New Bill Page
 * 
 * Allows users to create a new bill by:
 * 1. Scanning a receipt (OCR with OpenAI Vision)
 * 2. Adding items manually
 * 3. Adding participants
 * 4. Assigning items to participants
 */

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePlasmaWallet } from "@plasma-pay/privy-auth";
import { Camera, Plus, Trash2, Users, Loader2, ArrowLeft, Upload, Sparkles } from "lucide-react";
import Link from "next/link";
import { v4 as uuid } from "uuid";
import { PARTICIPANT_COLORS } from "@/lib/types";
import type { BillItem, Participant } from "@/lib/types";

export default function NewBillPage() {
  const router = useRouter();
  const { wallet } = usePlasmaWallet();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bill state
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<BillItem[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [taxPercent, setTaxPercent] = useState(0);
  const [tipPercent, setTipPercent] = useState(0);

  // UI state
  const [scanning, setScanning] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newParticipantName, setNewParticipantName] = useState("");
  const [newParticipantEmail, setNewParticipantEmail] = useState("");

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * (taxPercent / 100);
  const tip = subtotal * (tipPercent / 100);
  const total = subtotal + tax + tip;

  // Handle receipt scan
  async function handleScan(file: File) {
    if (!file) return;

    setScanning(true);
    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      // Send to OCR API
      const response = await fetch("/api/scan-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Add scanned items
        if (data.items && data.items.length > 0) {
          const newItems: BillItem[] = data.items.map((item: any) => ({
            id: uuid(),
            name: item.name,
            price: item.price,
            quantity: item.quantity || 1,
            assignedToParticipantIds: [],
          }));
          setItems([...items, ...newItems]);
        }

        // Set title from merchant name
        if (data.merchant && !title) {
          setTitle(data.merchant);
        }

        // Set tax and tip if detected
        if (data.taxPercent) setTaxPercent(data.taxPercent);
        if (data.tipPercent) setTipPercent(data.tipPercent);
      }
    } catch {
      // Silent fail - user can try again or add items manually
    } finally {
      setScanning(false);
    }
  }

  // Add item manually
  function addItem() {
    if (!newItemName || !newItemPrice) return;

    const item: BillItem = {
      id: uuid(),
      name: newItemName,
      price: parseFloat(newItemPrice),
      quantity: 1,
      assignedToParticipantIds: [],
    };

    setItems([...items, item]);
    setNewItemName("");
    setNewItemPrice("");
  }

  // Remove item
  function removeItem(id: string) {
    setItems(items.filter((i) => i.id !== id));
  }

  // Add participant
  function addParticipant() {
    if (!newParticipantName) return;

    const participant: Participant = {
      id: uuid(),
      name: newParticipantName,
      email: newParticipantEmail || undefined,
      color: PARTICIPANT_COLORS[participants.length % PARTICIPANT_COLORS.length],
      share: 0,
      assignedItemIds: [],
      paid: false,
    };

    setParticipants([...participants, participant]);
    setNewParticipantName("");
    setNewParticipantEmail("");
  }

  // Remove participant
  function removeParticipant(id: string) {
    setParticipants(participants.filter((p) => p.id !== id));
    // Remove participant from item assignments
    setItems(
      items.map((item) => ({
        ...item,
        assignedToParticipantIds: item.assignedToParticipantIds.filter((pid) => pid !== id),
      }))
    );
  }

  // Toggle item assignment
  function toggleItemAssignment(itemId: string, participantId: string) {
    setItems(
      items.map((item) => {
        if (item.id !== itemId) return item;

        const isAssigned = item.assignedToParticipantIds.includes(participantId);
        return {
          ...item,
          assignedToParticipantIds: isAssigned
            ? item.assignedToParticipantIds.filter((id) => id !== participantId)
            : [...item.assignedToParticipantIds, participantId],
        };
      })
    );
  }

  // Create bill
  async function createBill() {
    if (!wallet?.address || !title || items.length === 0 || participants.length === 0) return;

    setCreating(true);
    try {
      const response = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorAddress: wallet.address,
          title,
          items,
          participants,
          taxPercent,
          tipPercent,
          subtotal,
          tax,
          tip,
          total,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/bill/${data.bill.id}`);
      }
    } catch (error) {
      console.error("Failed to create bill:", error);
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen p-4 md:p-8 pb-32 relative">
      {/* Header */}
      <header className="flex items-center gap-4 mb-6">
        <Link href="/" className="p-2 rounded-xl hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white/60" />
        </Link>
        <h1 className="text-xl font-semibold text-white">New Bill</h1>
      </header>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Title */}
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Bill title (e.g., Dinner at Joe's)"
            className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[rgb(0,212,255)]"
          />
        </div>

        {/* Receipt scan */}
        <div className="p-6 rounded-2xl bg-white/5 border border-dashed border-white/20">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleScan(e.target.files[0])}
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={scanning}
            className="w-full flex flex-col items-center gap-3 py-4"
          >
            {scanning ? (
              <>
                <Loader2 className="w-10 h-10 text-[rgb(0,212,255)] animate-spin" />
                <span className="text-white/50">Scanning receipt...</span>
              </>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[rgb(0,212,255)]/20 flex items-center justify-center">
                    <Camera className="w-7 h-7 text-[rgb(0,212,255)]" />
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                    <Upload className="w-7 h-7 text-purple-400" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-white font-medium">Scan Receipt</p>
                  <p className="text-white/40 text-sm flex items-center gap-1 justify-center">
                    <Sparkles className="w-3 h-3" />
                    AI-powered OCR
                  </p>
                </div>
              </>
            )}
          </button>
        </div>

        {/* Items section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="text-2xl">🍽️</span>
            Items
          </h2>

          {/* Items list */}
          {items.length > 0 && (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-white/5 flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{item.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-white/50 text-sm">
                        ${item.price.toFixed(2)} × {item.quantity}
                      </span>
                      {/* Participant assignment dots */}
                      {participants.length > 0 && (
                        <div className="flex gap-1">
                          {participants.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => toggleItemAssignment(item.id, p.id)}
                              className={`w-5 h-5 rounded-full border-2 transition-all ${
                                item.assignedToParticipantIds.includes(p.id)
                                  ? "border-transparent"
                                  : "border-white/20 bg-transparent"
                              }`}
                              style={{
                                backgroundColor: item.assignedToParticipantIds.includes(p.id)
                                  ? p.color
                                  : "transparent",
                              }}
                              title={p.name}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-2 rounded-xl hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add item form */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Item name"
              className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[rgb(0,212,255)] text-sm"
            />
            <div className="relative w-24">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">$</span>
              <input
                type="number"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                placeholder="0.00"
                step="0.01"
                className="w-full px-4 py-2 pl-6 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[rgb(0,212,255)] text-sm"
              />
            </div>
            <button
              onClick={addItem}
              disabled={!newItemName || !newItemPrice}
              className="p-2 rounded-xl bg-[rgb(0,212,255)]/20 text-[rgb(0,212,255)] hover:bg-[rgb(0,212,255)]/30 transition-colors disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Participants section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            People
          </h2>

          {/* Participants list */}
          {participants.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/5"
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-white text-sm">{p.name}</span>
                  <button
                    onClick={() => removeParticipant(p.id)}
                    className="p-1 rounded-full hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add participant form */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newParticipantName}
              onChange={(e) => setNewParticipantName(e.target.value)}
              placeholder="Name"
              className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[rgb(0,212,255)] text-sm"
              onKeyDown={(e) => e.key === "Enter" && addParticipant()}
            />
            <input
              type="email"
              value={newParticipantEmail}
              onChange={(e) => setNewParticipantEmail(e.target.value)}
              placeholder="Email (optional)"
              className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[rgb(0,212,255)] text-sm"
              onKeyDown={(e) => e.key === "Enter" && addParticipant()}
            />
            <button
              onClick={addParticipant}
              disabled={!newParticipantName}
              className="p-2 rounded-xl bg-[rgb(0,212,255)]/20 text-[rgb(0,212,255)] hover:bg-[rgb(0,212,255)]/30 transition-colors disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tax & Tip */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-white/50 text-sm mb-2">Tax %</label>
            <input
              type="number"
              value={taxPercent}
              onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[rgb(0,212,255)]"
            />
          </div>
          <div>
            <label className="block text-white/50 text-sm mb-2">Tip %</label>
            <input
              type="number"
              value={tipPercent}
              onChange={(e) => setTipPercent(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[rgb(0,212,255)]"
            />
          </div>
        </div>

        {/* Totals */}
        {items.length > 0 && (
          <div className="p-4 rounded-2xl bg-white/5 space-y-2">
            <div className="flex justify-between text-white/50">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {taxPercent > 0 && (
              <div className="flex justify-between text-white/50">
                <span>Tax ({taxPercent}%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
            )}
            {tipPercent > 0 && (
              <div className="flex justify-between text-white/50">
                <span>Tip ({tipPercent}%)</span>
                <span>${tip.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-white/10">
              <span>Total</span>
              <span className="gradient-text">${total.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Fixed create button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={createBill}
            disabled={creating || !title || items.length === 0 || participants.length === 0}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {creating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Bill"
            )}
          </button>
        </div>
      </div>
    </main>
  );
}

