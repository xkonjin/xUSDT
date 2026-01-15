'use client';

import { useEffect, useState, useRef } from 'react';
import { DollarSign, TrendingUp } from 'lucide-react';

interface SavingsCounterProps {
  amount: number;
  duration?: number; // Animation duration in ms
  className?: string;
}

export function SavingsCounter({ amount, duration = 2000, className = '' }: SavingsCounterProps) {
  const [displayAmount, setDisplayAmount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const counterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasAnimated) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          animateValue(0, amount, duration);
        }
      },
      { threshold: 0.5 }
    );

    if (counterRef.current) {
      observer.observe(counterRef.current);
    }

    return () => observer.disconnect();
  }, [amount, duration, hasAnimated]);

  // Also trigger animation immediately if amount changes and already in view
  useEffect(() => {
    if (amount > 0) {
      animateValue(0, amount, duration);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount]);

  const animateValue = (start: number, end: number, dur: number) => {
    const startTime = performance.now();
    
    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / dur, 1);
      
      // Ease out cubic for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = start + (end - start) * easeOut;
      
      setDisplayAmount(Math.round(currentValue * 100) / 100);
      
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    
    requestAnimationFrame(step);
  };

  const formatAmount = (value: number): string => {
    if (value >= 1000) {
      return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return value.toFixed(2);
  };

  return (
    <div 
      ref={counterRef}
      className={`glass-elevated p-8 text-center relative overflow-hidden ${className}`}
    >
      {/* Glow effect behind number */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-48 h-48 rounded-full bg-brand-500/20 blur-3xl" />
      </div>

      {/* Icon */}
      <div className="relative inline-flex items-center justify-center w-16 h-16 mb-4 glass-red rounded-2xl">
        <TrendingUp className="w-8 h-8 text-brand-400" />
      </div>

      {/* Amount */}
      <div className="relative">
        <div className="flex items-baseline justify-center gap-1">
          <DollarSign className="w-10 h-10 text-brand-400 mb-2" />
          <span className="savings-number">
            {formatAmount(displayAmount)}
          </span>
        </div>
      </div>

      {/* Label */}
      <p className="savings-label mt-4">
        saved so far
      </p>

      {/* Decorative elements */}
      <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-brand-500/10 blur-2xl" />
      <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-brand-500/10 blur-2xl" />
    </div>
  );
}

// Compact variant for dashboard
export function SavingsCounterCompact({ amount, className = '' }: { amount: number; className?: string }) {
  return (
    <div className={`glass-subtle p-4 text-center ${className}`}>
      <div className="flex items-center justify-center gap-2 mb-1">
        <TrendingUp className="w-5 h-5 text-brand-400" />
        <span className="text-2xl font-bold font-heading text-brand-400">
          ${amount.toFixed(2)}
        </span>
      </div>
      <p className="text-sm text-white/50">saved this month</p>
    </div>
  );
}
