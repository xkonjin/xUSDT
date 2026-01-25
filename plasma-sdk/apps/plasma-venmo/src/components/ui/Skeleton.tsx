"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-white/10",
        className
      )}
    />
  );
}

export function BalanceSkeleton() {
  return (
    <div className="clay-card p-8">
      <div className="flex items-start justify-between mb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
      <div className="flex items-baseline gap-3">
        <Skeleton className="h-12 w-40" />
        <Skeleton className="h-5 w-14" />
      </div>
      <Skeleton className="h-4 w-20 mt-4" />
    </div>
  );
}

export function TransactionSkeleton() {
  return (
    <div className="clay-list-item">
      <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="text-right">
        <Skeleton className="h-5 w-16 mb-1" />
        <Skeleton className="h-3 w-12 ml-auto" />
      </div>
    </div>
  );
}

export function TransactionListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <TransactionSkeleton key={i} />
      ))}
    </div>
  );
}

export function RequestSkeleton() {
  return (
    <div className="clay-list-item">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-16 rounded-lg" />
        <Skeleton className="h-8 w-16 rounded-lg" />
      </div>
    </div>
  );
}

export function PaymentLinkSkeleton() {
  return (
    <div className="clay-list-item">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div>
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-12" />
        <Skeleton className="w-8 h-8 rounded-lg" />
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="clay-card p-6 md:p-8 space-y-5">
      <Skeleton className="h-6 w-32 mb-4" />
      <div>
        <Skeleton className="h-4 w-40 mb-2" />
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>
      <div>
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>
      <Skeleton className="h-12 w-full rounded-2xl" />
    </div>
  );
}
