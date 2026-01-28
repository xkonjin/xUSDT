"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div 
      className={cn(
        "relative overflow-hidden bg-white/8 rounded-lg",
        "after:absolute after:inset-0",
        "after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent",
        "after:animate-shimmer",
        className
      )} 
    />
  );
}

export function TransactionListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className="flex items-center gap-4 p-4 rounded-2xl bg-white/3"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2.5">
            <Skeleton className="h-4 w-3/4 rounded-md" />
            <Skeleton className="h-3 w-1/2 rounded-md" />
          </div>
          <Skeleton className="h-6 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function ContactSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div 
          key={i} 
          className="flex flex-col items-center gap-2.5 min-w-[72px]"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <Skeleton className="w-14 h-14 rounded-full" />
          <Skeleton className="h-3 w-12 rounded" />
        </div>
      ))}
    </div>
  );
}

export function PaymentLinkSkeleton() {
  return (
    <div className="p-4 rounded-2xl bg-white/3 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32 rounded-md" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-48 rounded-md" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-20 rounded" />
        <Skeleton className="h-3 w-24 rounded" />
      </div>
    </div>
  );
}

export function RequestSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/3">
      <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2.5">
        <Skeleton className="h-4 w-3/4 rounded-md" />
        <Skeleton className="h-3 w-1/2 rounded-md" />
      </div>
      <div className="flex flex-col items-end gap-2">
        <Skeleton className="h-5 w-16 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-xl" />
      </div>
    </div>
  );
}

export function BalanceSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-24 rounded-md" />
      <Skeleton className="h-12 w-40 rounded-lg" />
      <Skeleton className="h-4 w-20 rounded-md" />
    </div>
  );
}
