"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          // Base styles
          "inline-flex items-center justify-center font-medium font-heading rounded-2xl transition-all duration-200 ease-out",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
          "active:scale-[0.98] touch-target",
          // Variants
          {
            // Primary - Red glass button
            "glass-btn": variant === "primary",
            // Secondary - Subtle glass button
            "glass-btn-secondary": variant === "secondary",
            // Outline - Border only
            "glass-btn-outline": variant === "outline",
            // Ghost - Minimal
            "text-white/70 hover:text-white hover:bg-white/10 focus-visible:ring-white/50": variant === "ghost",
            // Danger - Red warning
            "glass-btn-danger": variant === "danger",
          },
          // Sizes
          {
            "px-4 py-2 text-sm gap-1.5 min-h-[40px] rounded-xl": size === "sm",
            "px-5 py-2.5 text-base gap-2 min-h-[48px]": size === "md",
            "px-8 py-4 text-lg gap-2.5 min-h-[56px]": size === "lg",
          },
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
