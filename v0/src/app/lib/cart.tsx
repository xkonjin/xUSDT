"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartState = Record<number, number>;

type CartContextValue = {
  cart: CartState;
  add: (toyId: number, qty?: number) => void;
  remove: (toyId: number, qty?: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function loadInitial(): CartState {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem("tt_cart") : null;
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartState>(loadInitial);

  // persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("tt_cart", JSON.stringify(cart));
    } catch {}
  }, [cart]);

  const value = useMemo<CartContextValue>(() => ({
    cart,
    add: (toyId, qty = 1) => setCart(c => ({ ...c, [toyId]: (c[toyId] || 0) + qty })),
    remove: (toyId, qty = 1) => setCart(c => {
      const next = { ...c } as CartState;
      const cur = next[toyId] || 0;
      if (cur <= qty) delete next[toyId]; else next[toyId] = cur - qty;
      return next;
    }),
    clear: () => setCart({}),
  }), [cart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
