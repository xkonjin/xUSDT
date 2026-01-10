"use client";

/**
 * New Bill Page - Production-Ready Version
 * 
 * Features:
 * - Receipt scanning with progress indicator
 * - Better item assignment UI with chips
 * - Split equally button
 * - Tax/tip presets
 * - Receipt preview after scan
 */

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePlasmaWallet } from "@plasma-pay/privy-auth";
import { 
  Camera, Plus, Trash2, Users, Loader2, ArrowLeft, Upload, Sparkles,
  Check, UserPlus, DollarSign, Percent, Image as ImageIcon
} from "lucide-react";
import Link from "next/link";
import { v4 as uuid } from "uuid";
import { PARTICIPANT_COLORS } from "@/lib/types";
import type { BillItem, Participant } from "@/lib/types";

// Tip presets
const TIP_PRESETS = [15, 18, 20, 25];

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
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStage, setScanStage] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newParticipantName, setNewParticipantName] = useState("");
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isMockData, setIsMockData] = useState(false);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * (taxPercent / 100);
  const tip = subtotal * (tipPercent / 100);
  const total = subtotal + tax + tip;

  // Handle receipt scan with progress
  async function handleScan(file: File) {
    if (!file) return;

    setScanning(true);
    setScanProgress(0);
    setScanStage("Processing image...");
    setReceiptPreview(URL.createObjectURL(file));
    setIsMockData(false);

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      setScanProgress(30);
      setScanStage("Analyzing receipt...");

      // Send to OCR API
      const response = await fetch("/api/scan-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });

      setScanProgress(70);
      setScanStage("Extracting items...");

      if (response.ok) {
        const data = await response.json();
        
        // Check if it's mock data
        if (data.isMock || data.mock) {
          setIsMockData(true);
        }
        
        // Add scanned items
        if (data.items && data.items.length > 0) {
          const newItems: BillItem[] = data.items.map((item: { name: string; price: number; quantity?: number }) => ({
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

        // Set tax if detected
        if (data.taxPercent) setTaxPercent(data.taxPercent);

        setScanProgress(100);
        setScanStage("Complete!");
      }
    } catch {
      setScanStage("Scan failed - add items manually");
    } finally {
      setTimeout(() => {
        setScanning(false);
        setScanProgress(0);
        setScanStage("");
      }, 1000);
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
      color: PARTICIPANT_COLORS[participants.length % PARTICIPANT_COLORS.length],
      share: 0,
      assignedItemIds: [],
      paid: false,
    };

    setParticipants([...participants, participant]);
    setNewParticipantName("");
  }

  // Remove participant
  function removeParticipant(id: string) {
    setParticipants(participants.filter((p) => p.id !== id));
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

  // Split item equally among all participants
  function splitItemEqually(itemId: string) {
    setItems(
      items.map((item) => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          assignedToParticipantIds: participants.map((p) => p.id),
        };
      })
    );
  }

  // Split all items equally
  function splitAllEqually() {
    setItems(
      items.map((item) => ({
        ...item,
        assignedToParticipantIds: participants.map((p) => p.id),
      }))
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
    } catch {
      // Handle error
    } finally {
      setCreating(false);
    }
  }

  // Calculate per-person shares for preview
  const calculateShares = () => {
    const shares: Record<string, number> = {};
    participants.forEach((p) => {
      shares[p.id] = 0;
    });

    items.forEach((item) => {
      if (item.assignedToParticipantIds.length > 0) {
        const perPerson = (item.price * item.quantity) / item.assignedToParticipantIds.length;
        item.assignedToParticipantIds.forEach((pid) => {
          shares[pid] = (shares[pid] || 0) + perPerson;
        });
      }
    });

    // Add proportional tax and tip
    const totalAssigned = Object.values(shares).reduce((a, b) => a + b, 0);
    if (totalAssigned > 0) {
      Object.keys(shares).forEach((pid) => {
        const proportion = shares[pid] / totalAssigned;
        shares[pid] += (tax + tip) * proportion;
      });
    }

    return shares;
  };

  const shares = calculateShares();

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
            className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[rgb(0,212,255)] text-lg"
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
          
          {scanning ? (
            <div className="text-center py-4">
              <Loader2 className="w-10 h-10 text-[rgb(0,212,255)] animate-spin mx-auto mb-4" />
              <p className="text-white font-medium mb-2">{scanStage}</p>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[rgb(0,212,255)] to-purple-500 transition-all duration-500"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
            </div>
          ) : receiptPreview ? (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden">
                <img 
                  src={receiptPreview} 
                  alt="Receipt" 
                  className="w-full max-h-48 object-cover opacity-50"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-green-500/20 backdrop-blur-sm rounded-full p-3">
                    <Check className="w-8 h-8 text-green-400" />
                  </div>
                </div>
              </div>
              {isMockData && (
                <div className="text-amber-400 text-sm text-center bg-amber-500/10 rounded-xl p-2">
                  Demo data shown - configure OpenAI for real OCR
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 text-[rgb(0,212,255)] text-sm hover:underline"
              >
                Scan another receipt
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center gap-3 py-4"
            >
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
            </button>
          )}
        </div>

        {/* Items section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              🍽️ Items
            </h2>
            {items.length > 0 && participants.length > 1 && (
              <button
                onClick={splitAllEqually}
                className="text-sm text-[rgb(0,212,255)] hover:underline flex items-center gap-1"
              >
                <Users className="w-4 h-4" />
                Split all equally
              </button>
            )}
          </div>

          {/* Items list */}
          {items.length > 0 && (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-white/5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{item.name}</p>
                      <p className="text-white/50 text-sm">
                        ${item.price.toFixed(2)} × {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 rounded-xl hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Participant assignment chips */}
                  {participants.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {participants.map((p) => {
                        const isAssigned = item.assignedToParticipantIds.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            onClick={() => toggleItemAssignment(item.id, p.id)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                              isAssigned
                                ? "text-black"
                                : "bg-white/10 text-white/60 hover:bg-white/20"
                            }`}
                            style={{
                              backgroundColor: isAssigned ? p.color : undefined,
                            }}
                          >
                            {isAssigned && <Check className="w-3 h-3" />}
                            {p.name}
                          </button>
                        );
                      })}
                      {participants.length > 1 && (
                        <button
                          onClick={() => splitItemEqually(item.id)}
                          className="px-3 py-1.5 rounded-full text-sm bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60 transition-colors"
                        >
                          Split equally
                        </button>
                      )}
                    </div>
                  )}
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
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[rgb(0,212,255)] text-sm"
              onKeyDown={(e) => e.key === "Enter" && addItem()}
            />
            <div className="relative w-28">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="number"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                placeholder="0.00"
                step="0.01"
                className="w-full px-4 py-2.5 pl-8 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[rgb(0,212,255)] text-sm"
                onKeyDown={(e) => e.key === "Enter" && addItem()}
              />
            </div>
            <button
              onClick={addItem}
              disabled={!newItemName || !newItemPrice}
              className="p-2.5 rounded-xl bg-[rgb(0,212,255)]/20 text-[rgb(0,212,255)] hover:bg-[rgb(0,212,255)]/30 transition-colors disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Participants section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            People
          </h2>

          {/* Participants with share preview */}
          {participants.length > 0 && (
            <div className="grid gap-2">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="text-white font-medium">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-white/60 text-sm">
                      ${(shares[p.id] || 0).toFixed(2)}
                    </span>
                    <button
                      onClick={() => removeParticipant(p.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add participant */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newParticipantName}
              onChange={(e) => setNewParticipantName(e.target.value)}
              placeholder="Add person..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[rgb(0,212,255)] text-sm"
              onKeyDown={(e) => e.key === "Enter" && addParticipant()}
            />
            <button
              onClick={addParticipant}
              disabled={!newParticipantName}
              className="p-2.5 rounded-xl bg-[rgb(0,212,255)]/20 text-[rgb(0,212,255)] hover:bg-[rgb(0,212,255)]/30 transition-colors disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tax & Tip */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-white/50 text-sm mb-2 flex items-center gap-1">
              <Percent className="w-4 h-4" />
              Tax
            </label>
            <div className="relative">
              <input
                type="number"
                value={taxPercent}
                onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2.5 pr-8 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[rgb(0,212,255)]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">%</span>
            </div>
          </div>
          <div>
            <label className="block text-white/50 text-sm mb-2 flex items-center gap-1">
              <Percent className="w-4 h-4" />
              Tip
            </label>
            <div className="space-y-2">
              <div className="flex gap-1">
                {TIP_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setTipPercent(preset)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      tipPercent === preset
                        ? "bg-[rgb(0,212,255)] text-black"
                        : "bg-white/10 text-white/60 hover:bg-white/20"
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={tipPercent}
                  onChange={(e) => setTipPercent(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 pr-8 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[rgb(0,212,255)]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">%</span>
              </div>
            </div>
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
            <div className="flex justify-between text-white font-bold text-xl pt-2 border-t border-white/10">
              <span>Total</span>
              <span className="gradient-text">${total.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Fixed create button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/95 to-transparent">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={createBill}
            disabled={creating || !title || items.length === 0 || participants.length === 0}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
          >
            {creating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Create Bill
              </>
            )}
          </button>
          {(!title || items.length === 0 || participants.length === 0) && (
            <p className="text-white/40 text-xs text-center mt-2">
              {!title ? "Add a title" : items.length === 0 ? "Add at least one item" : "Add at least one person"}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
