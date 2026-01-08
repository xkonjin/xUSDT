import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import type { Bill, BillItem, Participant } from './types';
import { PARTICIPANT_COLORS } from './types';

interface BillStore {
  currentBill: Bill | null;
  bills: Bill[];
  
  createBill: (creatorAddress: string) => string;
  updateBill: (updates: Partial<Bill>) => void;
  
  addItem: (item: Omit<BillItem, 'id' | 'assignedToParticipantIds'>) => void;
  updateItem: (id: string, updates: Partial<BillItem>) => void;
  removeItem: (id: string) => void;
  
  addParticipant: (name: string, email?: string, phone?: string) => string;
  updateParticipant: (id: string, updates: Partial<Participant>) => void;
  removeParticipant: (id: string) => void;
  
  assignItemToParticipant: (itemId: string, participantId: string) => void;
  unassignItemFromParticipant: (itemId: string, participantId: string) => void;
  splitItemEqually: (itemId: string) => void;
  
  setTipPercent: (percent: number) => void;
  setTaxPercent: (percent: number) => void;
  
  calculateShares: () => void;
  
  saveBill: () => string;
  loadBill: (id: string) => void;
  resetBill: () => void;
  
  markParticipantPaid: (participantId: string, txHash: string) => void;
}

const calculateTotals = (items: BillItem[], taxPercent: number, tipPercent: number) => {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * (taxPercent / 100);
  const tip = subtotal * (tipPercent / 100);
  const total = subtotal + tax + tip;
  return { subtotal, tax, tip, total };
};

const calculateParticipantShares = (
  items: BillItem[],
  participants: Participant[],
  subtotal: number,
  tax: number,
  tip: number
): Participant[] => {
  if (participants.length === 0) return participants;
  
  return participants.map(participant => {
    let itemShare = 0;
    
    items.forEach(item => {
      if (item.assignedToParticipantIds.includes(participant.id)) {
        const itemTotal = item.price * item.quantity;
        const splitCount = item.assignedToParticipantIds.length;
        itemShare += itemTotal / splitCount;
      }
    });
    
    const proportion = subtotal > 0 ? itemShare / subtotal : 1 / participants.length;
    const taxShare = tax * proportion;
    const tipShare = tip * proportion;
    const totalShare = Math.round((itemShare + taxShare + tipShare) * 100) / 100;
    
    return {
      ...participant,
      share: totalShare,
      assignedItemIds: items.filter(item => item.assignedToParticipantIds.includes(participant.id)).map(item => item.id),
    };
  });
};

export const useBillStore = create<BillStore>()(
  persist(
    (set, get) => ({
      currentBill: null,
      bills: [],
      
      createBill: (creatorAddress: string) => {
        const id = uuid();
        const bill: Bill = {
          id,
          title: 'New Bill',
          creatorAddress: creatorAddress as `0x${string}`,
          items: [],
          participants: [],
          subtotal: 0,
          tax: 0,
          taxPercent: 0,
          tip: 0,
          tipPercent: 15,
          total: 0,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'draft',
        };
        set({ currentBill: bill });
        return id;
      },
      
      updateBill: (updates) => {
        const { currentBill } = get();
        if (!currentBill) return;
        set({ currentBill: { ...currentBill, ...updates, updatedAt: new Date() } });
      },
      
      addItem: (item) => {
        const { currentBill } = get();
        if (!currentBill) return;
        
        const newItem: BillItem = {
          ...item,
          id: uuid(),
          assignedToParticipantIds: [],
        };
        
        const items = [...currentBill.items, newItem];
        const { subtotal, tax, tip, total } = calculateTotals(items, currentBill.taxPercent, currentBill.tipPercent);
        const participants = calculateParticipantShares(items, currentBill.participants, subtotal, tax, tip);
        
        set({
          currentBill: {
            ...currentBill,
            items,
            participants,
            subtotal,
            tax,
            tip,
            total,
            updatedAt: new Date(),
          },
        });
      },
      
      updateItem: (id, updates) => {
        const { currentBill } = get();
        if (!currentBill) return;
        
        const items = currentBill.items.map(item =>
          item.id === id ? { ...item, ...updates } : item
        );
        const { subtotal, tax, tip, total } = calculateTotals(items, currentBill.taxPercent, currentBill.tipPercent);
        const participants = calculateParticipantShares(items, currentBill.participants, subtotal, tax, tip);
        
        set({
          currentBill: {
            ...currentBill,
            items,
            participants,
            subtotal,
            tax,
            tip,
            total,
            updatedAt: new Date(),
          },
        });
      },
      
      removeItem: (id) => {
        const { currentBill } = get();
        if (!currentBill) return;
        
        const items = currentBill.items.filter(item => item.id !== id);
        const { subtotal, tax, tip, total } = calculateTotals(items, currentBill.taxPercent, currentBill.tipPercent);
        const participants = calculateParticipantShares(items, currentBill.participants, subtotal, tax, tip);
        
        set({
          currentBill: {
            ...currentBill,
            items,
            participants,
            subtotal,
            tax,
            tip,
            total,
            updatedAt: new Date(),
          },
        });
      },
      
      addParticipant: (name, email, phone) => {
        const { currentBill } = get();
        if (!currentBill) return '';
        
        const id = uuid();
        const colorIndex = currentBill.participants.length % PARTICIPANT_COLORS.length;
        
        const participant: Participant = {
          id,
          name,
          email,
          phone,
          color: PARTICIPANT_COLORS[colorIndex],
          share: 0,
          assignedItemIds: [],
          paid: false,
        };
        
        const participants = [...currentBill.participants, participant];
        const { subtotal, tax, tip } = calculateTotals(currentBill.items, currentBill.taxPercent, currentBill.tipPercent);
        const updatedParticipants = calculateParticipantShares(currentBill.items, participants, subtotal, tax, tip);
        
        set({
          currentBill: {
            ...currentBill,
            participants: updatedParticipants,
            updatedAt: new Date(),
          },
        });
        
        return id;
      },
      
      updateParticipant: (id, updates) => {
        const { currentBill } = get();
        if (!currentBill) return;
        
        const participants = currentBill.participants.map(p =>
          p.id === id ? { ...p, ...updates } : p
        );
        
        set({
          currentBill: {
            ...currentBill,
            participants,
            updatedAt: new Date(),
          },
        });
      },
      
      removeParticipant: (id) => {
        const { currentBill } = get();
        if (!currentBill) return;
        
        const items = currentBill.items.map(item => ({
          ...item,
          assignedToParticipantIds: item.assignedToParticipantIds.filter(pId => pId !== id),
        }));
        
        const participants = currentBill.participants.filter(p => p.id !== id);
        const { subtotal, tax, tip, total } = calculateTotals(items, currentBill.taxPercent, currentBill.tipPercent);
        const updatedParticipants = calculateParticipantShares(items, participants, subtotal, tax, tip);
        
        set({
          currentBill: {
            ...currentBill,
            items,
            participants: updatedParticipants,
            subtotal,
            tax,
            tip,
            total,
            updatedAt: new Date(),
          },
        });
      },
      
      assignItemToParticipant: (itemId, participantId) => {
        const { currentBill } = get();
        if (!currentBill) return;
        
        const items = currentBill.items.map(item => {
          if (item.id === itemId && !item.assignedToParticipantIds.includes(participantId)) {
            return { ...item, assignedToParticipantIds: [...item.assignedToParticipantIds, participantId] };
          }
          return item;
        });
        
        const { subtotal, tax, tip, total } = calculateTotals(items, currentBill.taxPercent, currentBill.tipPercent);
        const participants = calculateParticipantShares(items, currentBill.participants, subtotal, tax, tip);
        
        set({
          currentBill: {
            ...currentBill,
            items,
            participants,
            subtotal,
            tax,
            tip,
            total,
            updatedAt: new Date(),
          },
        });
      },
      
      unassignItemFromParticipant: (itemId, participantId) => {
        const { currentBill } = get();
        if (!currentBill) return;
        
        const items = currentBill.items.map(item => {
          if (item.id === itemId) {
            return { ...item, assignedToParticipantIds: item.assignedToParticipantIds.filter(id => id !== participantId) };
          }
          return item;
        });
        
        const { subtotal, tax, tip, total } = calculateTotals(items, currentBill.taxPercent, currentBill.tipPercent);
        const participants = calculateParticipantShares(items, currentBill.participants, subtotal, tax, tip);
        
        set({
          currentBill: {
            ...currentBill,
            items,
            participants,
            subtotal,
            tax,
            tip,
            total,
            updatedAt: new Date(),
          },
        });
      },
      
      splitItemEqually: (itemId) => {
        const { currentBill } = get();
        if (!currentBill || currentBill.participants.length === 0) return;
        
        const items = currentBill.items.map(item => {
          if (item.id === itemId) {
            return { ...item, assignedToParticipantIds: currentBill.participants.map(p => p.id) };
          }
          return item;
        });
        
        const { subtotal, tax, tip, total } = calculateTotals(items, currentBill.taxPercent, currentBill.tipPercent);
        const participants = calculateParticipantShares(items, currentBill.participants, subtotal, tax, tip);
        
        set({
          currentBill: {
            ...currentBill,
            items,
            participants,
            subtotal,
            tax,
            tip,
            total,
            updatedAt: new Date(),
          },
        });
      },
      
      setTipPercent: (percent) => {
        const { currentBill } = get();
        if (!currentBill) return;
        
        const { subtotal, tax, tip, total } = calculateTotals(currentBill.items, currentBill.taxPercent, percent);
        const participants = calculateParticipantShares(currentBill.items, currentBill.participants, subtotal, tax, tip);
        
        set({
          currentBill: {
            ...currentBill,
            tipPercent: percent,
            tip,
            total,
            participants,
            updatedAt: new Date(),
          },
        });
      },
      
      setTaxPercent: (percent) => {
        const { currentBill } = get();
        if (!currentBill) return;
        
        const { subtotal, tax, tip, total } = calculateTotals(currentBill.items, percent, currentBill.tipPercent);
        const participants = calculateParticipantShares(currentBill.items, currentBill.participants, subtotal, tax, tip);
        
        set({
          currentBill: {
            ...currentBill,
            taxPercent: percent,
            tax,
            total,
            participants,
            updatedAt: new Date(),
          },
        });
      },
      
      calculateShares: () => {
        const { currentBill } = get();
        if (!currentBill) return;
        
        const { subtotal, tax, tip, total } = calculateTotals(currentBill.items, currentBill.taxPercent, currentBill.tipPercent);
        const participants = calculateParticipantShares(currentBill.items, currentBill.participants, subtotal, tax, tip);
        
        set({
          currentBill: {
            ...currentBill,
            participants,
            subtotal,
            tax,
            tip,
            total,
            updatedAt: new Date(),
          },
        });
      },
      
      saveBill: () => {
        const { currentBill, bills } = get();
        if (!currentBill) return '';
        
        const updatedBill = { ...currentBill, status: 'active' as const, updatedAt: new Date() };
        const existingIndex = bills.findIndex(b => b.id === currentBill.id);
        
        if (existingIndex >= 0) {
          const updatedBills = [...bills];
          updatedBills[existingIndex] = updatedBill;
          set({ bills: updatedBills, currentBill: updatedBill });
        } else {
          set({ bills: [...bills, updatedBill], currentBill: updatedBill });
        }
        
        return currentBill.id;
      },
      
      loadBill: (id) => {
        const { bills } = get();
        const bill = bills.find(b => b.id === id);
        if (bill) {
          set({ currentBill: bill });
        }
      },
      
      resetBill: () => {
        set({ currentBill: null });
      },
      
      markParticipantPaid: (participantId, txHash) => {
        const { currentBill, bills } = get();
        if (!currentBill) return;
        
        const participants = currentBill.participants.map(p =>
          p.id === participantId
            ? { ...p, paid: true, paidAt: new Date(), txHash }
            : p
        );
        
        const allPaid = participants.every(p => p.paid);
        const updatedBill = {
          ...currentBill,
          participants,
          status: allPaid ? 'completed' as const : currentBill.status,
          updatedAt: new Date(),
        };
        
        const existingIndex = bills.findIndex(b => b.id === currentBill.id);
        if (existingIndex >= 0) {
          const updatedBills = [...bills];
          updatedBills[existingIndex] = updatedBill;
          set({ bills: updatedBills, currentBill: updatedBill });
        } else {
          set({ currentBill: updatedBill });
        }
      },
    }),
    {
      name: 'splitzy-bills',
      partialize: (state) => ({ bills: state.bills }),
    }
  )
);
