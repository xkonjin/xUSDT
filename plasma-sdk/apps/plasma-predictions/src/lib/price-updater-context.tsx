"use client";

import React, { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { PriceUpdater } from './price-updater';

const PriceUpdaterContext = createContext<PriceUpdater | null>(null);

export interface PriceUpdaterProviderProps {
  children: ReactNode;
  pollingInterval?: number;
}

export function PriceUpdaterProvider({ 
  children, 
  pollingInterval 
}: PriceUpdaterProviderProps) {
  const priceUpdaterRef = useRef<PriceUpdater | null>(null);
  
  // Create instance lazily
  if (!priceUpdaterRef.current) {
    priceUpdaterRef.current = new PriceUpdater({ pollingInterval });
  }
  
  useEffect(() => {
    const updater = priceUpdaterRef.current;
    if (updater) {
      updater.start();
    }
    
    return () => {
      if (updater) {
        updater.destroy();
        priceUpdaterRef.current = null;
      }
    };
  }, []);
  
  return (
    <PriceUpdaterContext.Provider value={priceUpdaterRef.current}>
      {children}
    </PriceUpdaterContext.Provider>
  );
}

export function usePriceUpdaterContext(): PriceUpdater {
  const context = useContext(PriceUpdaterContext);
  if (!context) {
    throw new Error('usePriceUpdaterContext must be used within PriceUpdaterProvider');
  }
  return context;
}
