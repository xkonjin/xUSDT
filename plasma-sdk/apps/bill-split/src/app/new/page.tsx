"use client";

/**
 * New Bill Page - Multi-Step Wizard
 * 
 * Claymorphism design with teal brand colors.
 * NO wallet signing required - bills are created without signatures.
 * 
 * Flow:
 * 1. Bill Details (title, amount, optional receipt photo)
 * 2. Add Participants (people by name with colors)
 * 3. Split Method (even, custom, or by item)
 * 4. Review & Create (per-person breakdown)
 * 5. Share (payment links via WhatsApp, SMS, copy, QR)
 */

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { v4 as uuid } from "uuid";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Upload,
  Plus,
  Trash2,
  Check,
  Users,
  Loader2,
  DollarSign,
  Receipt,
  Sparkles,
  Share2,
} from "lucide-react";
import { ParticipantChip, ParticipantAvatar, getParticipantColor, PARTICIPANT_COLORS } from "@/components/ParticipantChip";
import { ShareSheet } from "@/components/ShareSheet";

// Types
interface Participant {
  id: string;
  name: string;
  color: typeof PARTICIPANT_COLORS[number];
  customAmount?: number;
}

interface BillItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  assignedToParticipantIds: string[];
}

type SplitMethod = 'even' | 'custom' | 'by-item';

// Step definitions
const STEPS = [
  { id: 1, title: 'Bill Details', icon: Receipt },
  { id: 2, title: 'Add People', icon: Users },
  { id: 3, title: 'Split Method', icon: DollarSign },
  { id: 4, title: 'Review', icon: Check },
  { id: 5, title: 'Share', icon: Share2 },
] as const;

export default function NewBillPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);

  // Bill data
  const [title, setTitle] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('even');
  const [items, setItems] = useState<BillItem[]>([]);

  // UI state
  const [newParticipantName, setNewParticipantName] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [scanning, setScanning] = useState(false);
  const [creating, setCreating] = useState(false);
  const [billId, setBillId] = useState<string | null>(null);
  const [showShareSheet, setShowShareSheet] = useState(false);

  // Calculated values
  const total = parseFloat(totalAmount) || 0;

  // Calculate per-person shares
  const calculateShares = (): Record<string, number> => {
    const shares: Record<string, number> = {};
    participants.forEach(p => { shares[p.id] = 0; });

    if (participants.length === 0) return shares;

    if (splitMethod === 'even') {
      const perPerson = total / participants.length;
      participants.forEach(p => { shares[p.id] = perPerson; });
    } else if (splitMethod === 'custom') {
      participants.forEach(p => {
        shares[p.id] = p.customAmount || 0;
      });
    } else if (splitMethod === 'by-item') {
      items.forEach(item => {
        if (item.assignedToParticipantIds.length > 0) {
          const perPerson = (item.price * item.quantity) / item.assignedToParticipantIds.length;
          item.assignedToParticipantIds.forEach(pid => {
            shares[pid] = (shares[pid] || 0) + perPerson;
          });
        }
      });
    }

    return shares;
  };

  const shares = calculateShares();

  // Generate share links - uses the proper bill/participant pay URL
  const generateShareLinks = () => {
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3007');
    
    return participants.map(p => ({
      participantId: p.id,
      participantName: p.name,
      amount: p.share || shares[p.id] || 0,
      // Use the actual payment URL pattern: /bill/[id]/pay/[participantId]
      url: billId 
        ? `${baseUrl}/bill/${billId}/pay/${p.id}`
        : `${baseUrl}/pay/demo?name=${encodeURIComponent(p.name)}&amount=${(shares[p.id] || 0).toFixed(2)}`,
    }));
  };

  // Step validation
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1: return title.trim().length > 0 && total > 0;
      case 2: return participants.length >= 2;
      case 3: return true;
      case 4: return true;
      default: return false;
    }
  };

  // Handle receipt scan
  async function handleScan(file: File) {
    if (!file) return;

    setScanning(true);
    setReceiptPreview(URL.createObjectURL(file));

    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const response = await fetch("/api/scan-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Set title from merchant
        if (data.merchant && !title) {
          setTitle(data.merchant);
        }
        
        // Set total
        if (data.total) {
          setTotalAmount(data.total.toString());
        }

        // Add scanned items for by-item splitting
        if (data.items && data.items.length > 0) {
          const newItems: BillItem[] = data.items.map((item: { name: string; price: number; quantity?: number }) => ({
            id: uuid(),
            name: item.name,
            price: item.price,
            quantity: item.quantity || 1,
            assignedToParticipantIds: [],
          }));
          setItems(newItems);
        }
      }
    } catch {
      // Silent fail
    } finally {
      setScanning(false);
    }
  }

  // Add participant
  function addParticipant() {
    if (!newParticipantName.trim()) return;

    const participant: Participant = {
      id: uuid(),
      name: newParticipantName.trim(),
      color: getParticipantColor(participants.length),
    };

    setParticipants([...participants, participant]);
    setNewParticipantName("");
  }

  // Remove participant
  function removeParticipant(id: string) {
    setParticipants(participants.filter(p => p.id !== id));
    setItems(items.map(item => ({
      ...item,
      assignedToParticipantIds: item.assignedToParticipantIds.filter(pid => pid !== id),
    })));
  }

  // Add item (for by-item splitting)
  function addItem() {
    if (!newItemName.trim() || !newItemPrice) return;

    const item: BillItem = {
      id: uuid(),
      name: newItemName.trim(),
      price: parseFloat(newItemPrice),
      quantity: 1,
      assignedToParticipantIds: [],
    };

    setItems([...items, item]);
    setNewItemName("");
    setNewItemPrice("");
  }

  // Toggle item assignment
  function toggleItemAssignment(itemId: string, participantId: string) {
    setItems(items.map(item => {
      if (item.id !== itemId) return item;
      const isAssigned = item.assignedToParticipantIds.includes(participantId);
      return {
        ...item,
        assignedToParticipantIds: isAssigned
          ? item.assignedToParticipantIds.filter(id => id !== participantId)
          : [...item.assignedToParticipantIds, participantId],
      };
    }));
  }

  // Update custom amount
  function updateCustomAmount(participantId: string, amount: number) {
    setParticipants(participants.map(p => 
      p.id === participantId ? { ...p, customAmount: amount } : p
    ));
  }

  // Create bill (no signing!) - saves to database
  async function createBill() {
    setCreating(true);
    
    try {
      // Create bill via API (stores in database for payment link to work)
      const response = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorAddress: '0x0000000000000000000000000000000000000000', // Guest bills use zero address
          title,
          total,
          subtotal: total,
          tax: 0,
          tip: 0,
          participants: participants.map(p => ({
            id: p.id,
            name: p.name,
            email: null,
            phone: null,
            color: p.color,
            share: shares[p.id] || 0,
          })),
          items: items.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            assignedToParticipantIds: item.assignedToParticipantIds,
          })),
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create bill');
      }

      // Also save to localStorage for quick access
      const localBill = {
        id: result.bill.id,
        title,
        total,
        participants: result.bill.participants.map((p: any) => ({
          id: p.id,
          name: p.name,
          color: p.color,
          share: p.share,
          paid: p.paid,
        })),
        items,
        splitMethod,
        createdAt: new Date().toISOString(),
        status: 'active',
      };
      const existingBills = JSON.parse(localStorage.getItem('splitzy_bills') || '[]');
      localStorage.setItem('splitzy_bills', JSON.stringify([localBill, ...existingBills]));

      setBillId(result.bill.id);
      
      // Update participants with database IDs for correct payment links
      const updatedParticipants = participants.map((p, idx) => ({
        ...p,
        id: result.bill.participants[idx]?.id || p.id,
        share: result.bill.participants[idx]?.share || shares[p.id] || 0,
      }));
      setParticipants(updatedParticipants);
      
      // Move to share step
      setCurrentStep(5);
    } catch (err) {
      console.error('Create bill error:', err);
      // Fallback to localStorage-only for demo
      const newBillId = uuid();
      const localBill = {
        id: newBillId,
        title,
        total,
        participants: participants.map(p => ({
          ...p,
          share: shares[p.id] || 0,
          paid: false,
        })),
        items,
        splitMethod,
        createdAt: new Date().toISOString(),
        status: 'active',
      };
      const existingBills = JSON.parse(localStorage.getItem('splitzy_bills') || '[]');
      localStorage.setItem('splitzy_bills', JSON.stringify([localBill, ...existingBills]));
      setBillId(newBillId);
      setCurrentStep(5);
    } finally {
      setCreating(false);
    }
  }

  // Navigate steps
  function nextStep() {
    if (currentStep === 4) {
      createBill();
    } else if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  }

  function prevStep() {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link 
              href="/" 
              className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            
            <h1 className="text-lg font-bold text-slate-800 font-heading">
              {currentStep === 5 ? 'Share Bill' : 'New Bill'}
            </h1>
            
            <div className="w-10" />
          </div>

          {/* Step Indicator */}
          {currentStep < 5 && (
            <div className="step-indicator mt-4">
              {STEPS.slice(0, 4).map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div 
                    className={`
                      step-dot
                      ${currentStep === step.id ? 'step-dot-active' : ''}
                      ${currentStep > step.id ? 'step-dot-completed' : ''}
                    `}
                  />
                  {index < 3 && (
                    <div 
                      className={`
                        step-connector
                        ${currentStep > step.id ? 'step-connector-active' : ''}
                      `}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Step 1: Bill Details */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-splitzy-500 to-splitzy-600 flex items-center justify-center shadow-clay-teal">
                <Receipt className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 font-heading">Bill Details</h2>
              <p className="text-slate-500 mt-1">What&apos;s this bill for?</p>
            </div>

            {/* Title Input */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Bill Name</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Dinner at Joes"
                className="clay-input"
                autoFocus
              />
            </div>

            {/* Total Amount */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Total Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-slate-400 font-heading">$</span>
                <input
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  className="clay-input clay-input-large pl-10"
                />
              </div>
            </div>

            {/* Receipt Scan */}
            <div className="clay-card p-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleScan(e.target.files[0])}
              />
              
              {scanning ? (
                <div className="text-center py-6">
                  <Loader2 className="w-10 h-10 text-splitzy-500 animate-spin mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">Scanning receipt...</p>
                </div>
              ) : receiptPreview ? (
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden">
                    <img 
                      src={receiptPreview} 
                      alt="Receipt" 
                      className="w-full h-32 object-cover opacity-60"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Check className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full text-sm text-splitzy-600 hover:underline"
                  >
                    Scan another receipt
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center gap-3 py-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-splitzy-100 flex items-center justify-center">
                      <Camera className="w-6 h-6 text-splitzy-600" />
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                      <Upload className="w-6 h-6 text-violet-600" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-slate-700">Scan Receipt (Optional)</p>
                    <p className="text-sm text-slate-500 flex items-center gap-1 justify-center">
                      <Sparkles className="w-3 h-3" />
                      AI-powered OCR
                    </p>
                  </div>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Add Participants */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-splitzy-500 to-splitzy-600 flex items-center justify-center shadow-clay-teal">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 font-heading">Add People</h2>
              <p className="text-slate-500 mt-1">Who&apos;s splitting this bill?</p>
            </div>

            {/* Participants List */}
            {participants.length > 0 && (
              <div className="space-y-3">
                {participants.map((p) => (
                  <div
                    key={p.id}
                    className="clay-card p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <ParticipantAvatar name={p.name} color={p.color} size="md" />
                      <span className="font-medium text-slate-800">{p.name}</span>
                    </div>
                    <button
                      onClick={() => removeParticipant(p.id)}
                      className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Participant Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newParticipantName}
                onChange={(e) => setNewParticipantName(e.target.value)}
                placeholder="Add person..."
                className="clay-input flex-1"
                onKeyDown={(e) => e.key === 'Enter' && addParticipant()}
              />
              <button
                onClick={addParticipant}
                disabled={!newParticipantName.trim()}
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-splitzy-500 to-splitzy-600 flex items-center justify-center text-white shadow-clay-teal disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {participants.length < 2 && (
              <p className="text-center text-sm text-slate-500">
                Add at least 2 people to split the bill
              </p>
            )}
          </div>
        )}

        {/* Step 3: Split Method */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-splitzy-500 to-splitzy-600 flex items-center justify-center shadow-clay-teal">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 font-heading">Split Method</h2>
              <p className="text-slate-500 mt-1">How should we divide ${total.toFixed(2)}?</p>
            </div>

            {/* Split Method Options */}
            <div className="space-y-3">
              {/* Even Split */}
              <button
                onClick={() => setSplitMethod('even')}
                className={`w-full clay-card p-4 text-left transition-all ${
                  splitMethod === 'even' ? 'ring-2 ring-splitzy-500' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    splitMethod === 'even' 
                      ? 'border-splitzy-500 bg-splitzy-500' 
                      : 'border-slate-300'
                  }`}>
                    {splitMethod === 'even' && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Split Evenly</p>
                    <p className="text-sm text-slate-500">
                      ${(total / participants.length).toFixed(2)} per person
                    </p>
                  </div>
                </div>
              </button>

              {/* Custom Amounts */}
              <button
                onClick={() => setSplitMethod('custom')}
                className={`w-full clay-card p-4 text-left transition-all ${
                  splitMethod === 'custom' ? 'ring-2 ring-splitzy-500' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    splitMethod === 'custom' 
                      ? 'border-splitzy-500 bg-splitzy-500' 
                      : 'border-slate-300'
                  }`}>
                    {splitMethod === 'custom' && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Custom Amounts</p>
                    <p className="text-sm text-slate-500">Set specific amount for each person</p>
                  </div>
                </div>
              </button>

              {/* By Item */}
              <button
                onClick={() => setSplitMethod('by-item')}
                className={`w-full clay-card p-4 text-left transition-all ${
                  splitMethod === 'by-item' ? 'ring-2 ring-splitzy-500' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    splitMethod === 'by-item' 
                      ? 'border-splitzy-500 bg-splitzy-500' 
                      : 'border-slate-300'
                  }`}>
                    {splitMethod === 'by-item' && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">By Item</p>
                    <p className="text-sm text-slate-500">Assign items to specific people</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Custom Amounts UI */}
            {splitMethod === 'custom' && (
              <div className="space-y-3 pt-4">
                <h3 className="font-semibold text-slate-700">Set amounts</h3>
                {participants.map((p) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <ParticipantAvatar name={p.name} color={p.color} size="sm" />
                    <span className="flex-1 text-slate-700">{p.name}</span>
                    <div className="relative w-28">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                      <input
                        type="number"
                        value={p.customAmount || ''}
                        onChange={(e) => updateCustomAmount(p.id, parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        step="0.01"
                        className="clay-input text-right pr-3 pl-7 py-2"
                      />
                    </div>
                  </div>
                ))}
                <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                  <span className="text-slate-500">Total assigned:</span>
                  <span className={`font-semibold ${
                    Object.values(shares).reduce((a, b) => a + b, 0) === total
                      ? 'text-green-600'
                      : 'text-amber-600'
                  }`}>
                    ${Object.values(shares).reduce((a, b) => a + b, 0).toFixed(2)} / ${total.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* By Item UI */}
            {splitMethod === 'by-item' && (
              <div className="space-y-4 pt-4">
                <h3 className="font-semibold text-slate-700">Items</h3>
                
                {/* Items List */}
                {items.length > 0 && (
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.id} className="clay-card p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-800">{item.name}</span>
                          <span className="font-semibold text-slate-700">${item.price.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {participants.map((p) => (
                            <ParticipantChip
                              key={p.id}
                              name={p.name}
                              color={p.color}
                              isActive={item.assignedToParticipantIds.includes(p.id)}
                              showCheck
                              onClick={() => toggleItemAssignment(item.id, p.id)}
                              size="sm"
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Item */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Item name"
                    className="clay-input flex-1"
                  />
                  <div className="relative w-24">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="number"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      className="clay-input pl-7"
                    />
                  </div>
                  <button
                    onClick={addItem}
                    disabled={!newItemName.trim() || !newItemPrice}
                    className="w-12 h-12 rounded-xl bg-splitzy-100 flex items-center justify-center text-splitzy-600 hover:bg-splitzy-200 disabled:opacity-50 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-splitzy-500 to-splitzy-600 flex items-center justify-center shadow-clay-teal">
                <Check className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 font-heading">Review Bill</h2>
              <p className="text-slate-500 mt-1">Make sure everything looks right</p>
            </div>

            {/* Bill Summary Card */}
            <div className="clay-card p-5">
              <h3 className="text-xl font-bold text-slate-800 font-heading mb-4">{title}</h3>
              
              <div className="space-y-4">
                {/* Per-person breakdown */}
                <div className="space-y-3">
                  {participants.map((p) => (
                    <div key={p.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ParticipantAvatar name={p.name} color={p.color} size="sm" />
                        <span className="text-slate-700">{p.name}</span>
                      </div>
                      <span className="font-bold text-slate-800 font-heading">
                        ${(shares[p.id] || 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                  <span className="font-semibold text-slate-600">Total</span>
                  <span className="text-2xl font-bold gradient-text font-heading">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Split method badge */}
            <div className="text-center">
              <span className="clay-badge-teal">
                {splitMethod === 'even' && '✓ Split evenly'}
                {splitMethod === 'custom' && '✓ Custom amounts'}
                {splitMethod === 'by-item' && '✓ Split by items'}
              </span>
            </div>
          </div>
        )}

        {/* Step 5: Share */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg animate-success-bounce">
                <Check className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 font-heading">Bill Created!</h2>
              <p className="text-slate-500 mt-1">Share payment links with everyone</p>
            </div>

            {/* Share Cards */}
            <div className="space-y-4">
              {participants.map((p) => (
                <div key={p.id} className="clay-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <ParticipantAvatar name={p.name} color={p.color} size="md" />
                      <div>
                        <p className="font-semibold text-slate-800">{p.name}</p>
                        <p className="text-sm text-slate-500">owes</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-splitzy-600 font-heading">
                      ${(shares[p.id] || 0).toFixed(2)}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setShowShareSheet(true);
                    }}
                    className="w-full clay-button-secondary clay-button-small"
                  >
                    <Share2 className="w-4 h-4" />
                    Share Link
                  </button>
                </div>
              ))}
            </div>

            {/* Share All Button */}
            <button
              onClick={() => setShowShareSheet(true)}
              className="w-full clay-button clay-button-large"
            >
              <Share2 className="w-5 h-5" />
              Share All Links
            </button>

            {/* Done Button */}
            <Link
              href="/"
              className="block w-full clay-button-secondary clay-button-large text-center"
            >
              Done
            </Link>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      {currentStep < 5 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 p-4">
          <div className="max-w-lg mx-auto flex gap-3">
            {currentStep > 1 && (
              <button
                onClick={prevStep}
                className="flex-1 clay-button-secondary"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
            )}
            <button
              onClick={nextStep}
              disabled={!canProceed() || creating}
              className="flex-1 clay-button disabled:opacity-50"
            >
              {creating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : currentStep === 4 ? (
                <>
                  <Check className="w-5 h-5" />
                  Create Bill
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Share Sheet */}
      <ShareSheet
        isOpen={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        billTitle={title}
        shareLinks={generateShareLinks()}
      />
    </main>
  );
}
