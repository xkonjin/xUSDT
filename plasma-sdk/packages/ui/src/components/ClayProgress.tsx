"use client";

import React, { forwardRef } from "react";
import { cn } from "../lib/utils";

export interface ClayProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "success" | "warning" | "danger";
  showLabel?: boolean;
  animated?: boolean;
}

const sizeStyles = {
  sm: "h-2",
  md: "h-3",
  lg: "h-4",
};

const variantStyles = {
  primary: "bg-gradient-to-r from-blue-400 to-blue-500",
  success: "bg-gradient-to-r from-emerald-400 to-emerald-500",
  warning: "bg-gradient-to-r from-amber-400 to-amber-500",
  danger: "bg-gradient-to-r from-red-400 to-red-500",
};

const ClayProgress = forwardRef<HTMLDivElement, ClayProgressProps>(
  (
    {
      className = "",
      value = 0,
      max = 100,
      size = "md",
      variant = "primary",
      showLabel = false,
      animated = true,
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
      <div
        ref={ref}
        className={cn("w-full", className)}
        {...props}
      >
        {showLabel && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-700">Progress</span>
            <span className="text-sm font-bold text-slate-900">
              {Math.round(percentage)}%
            </span>
          </div>
        )}
        <div
          className={cn(
            "relative w-full rounded-full overflow-hidden",
            "bg-gradient-to-br from-slate-100 to-slate-200",
            "shadow-clay-inset",
            "border border-slate-300/40",
            sizeStyles[size]
          )}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              variantStyles[variant],
              animated && "animate-pulse"
            )}
            style={{
              width: `${percentage}%`,
              boxShadow: "0 0 10px rgba(0, 0, 0, 0.1)",
            }}
          />
        </div>
      </div>
    );
  }
);

ClayProgress.displayName = "ClayProgress";

export interface ClayProgressStepsProps
  extends React.HTMLAttributes<HTMLDivElement> {
  steps: Array<{ label: string; completed?: boolean; active?: boolean }>;
  size?: "sm" | "md" | "lg";
}

const stepSizeStyles = {
  sm: "w-6 h-6 text-xs",
  md: "w-8 h-8 text-sm",
  lg: "w-10 h-10 text-base",
};

export const ClayProgressSteps = forwardRef<HTMLDivElement, ClayProgressStepsProps>(
  ({ className = "", steps, size = "md", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-center justify-between", className)}
        {...props}
      >
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  stepSizeStyles[size],
                  "rounded-full flex items-center justify-center font-bold",
                  "shadow-clay-sm",
                  "transition-all duration-300",
                  step.completed
                    ? "bg-gradient-to-br from-emerald-400 to-emerald-500 text-white"
                    : step.active
                    ? "bg-gradient-to-br from-blue-400 to-blue-500 text-white shadow-clay scale-110"
                    : "bg-gradient-to-br from-slate-200 to-slate-300 text-slate-500"
                )}
              >
                {step.completed ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium text-center max-w-[80px]",
                  step.active ? "text-blue-600" : "text-slate-500"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 rounded-full",
                  "bg-slate-200",
                  steps[index].completed && "bg-emerald-400"
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }
);

ClayProgressSteps.displayName = "ClayProgressSteps";

export { ClayProgress };
