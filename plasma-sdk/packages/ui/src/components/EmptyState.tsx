"use client";

import { ReactNode } from "react";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: "default" | "compact";
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = "default",
}: EmptyStateProps) {
  const isCompact = variant === "compact";

  return (
    <div className={`text-center ${isCompact ? "py-8" : "py-16"}`}>
      {icon && (
        <div
          className={`mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center ${
            isCompact ? "w-16 h-16" : "w-24 h-24"
          }`}
        >
          <div className={`text-white/30 ${isCompact ? "scale-100" : "scale-125"}`}>
            {icon}
          </div>
        </div>
      )}
      <h3
        className={`font-semibold text-white/70 ${
          isCompact ? "text-base" : "text-lg"
        }`}
      >
        {title}
      </h3>
      {description && (
        <p
          className={`text-white/40 mt-1 max-w-sm mx-auto ${
            isCompact ? "text-sm" : "text-base"
          }`}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// Specific empty states for common scenarios
export function NoTransactionsEmpty() {
  return (
    <EmptyState
      icon={
        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      }
      title="No transactions yet"
      description="Your payment history will appear here"
    />
  );
}

export function NoBillsEmpty() {
  return (
    <EmptyState
      icon={
        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      }
      title="No bills yet"
      description="Create your first bill to get started"
    />
  );
}

export function NoStreamsEmpty({ role }: { role: "sending" | "receiving" }) {
  return (
    <EmptyState
      icon={
        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      }
      title={role === "sending" ? "No outgoing streams" : "No incoming streams"}
      description={
        role === "sending"
          ? "Create a stream to pay someone over time"
          : "You'll see incoming payment streams here"
      }
    />
  );
}

export function NoSubscriptionsEmpty() {
  return (
    <EmptyState
      icon={
        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
        </svg>
      }
      title="No subscriptions found"
      description="Scan your email to discover hidden subscriptions"
    />
  );
}
