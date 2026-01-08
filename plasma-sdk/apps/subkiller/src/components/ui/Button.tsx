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
          "inline-flex items-center justify-center font-medium rounded-2xl transition-all duration-300 ease-out",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
          "active:scale-[0.98] touch-target",
          {
            "bg-gradient-to-b from-[rgb(0,212,255)] to-[rgb(0,180,220)] text-black font-semibold shadow-[0_0_20px_rgba(0,212,255,0.4),0_4px_16px_rgba(0,0,0,0.3)] hover:shadow-[0_0_30px_rgba(0,212,255,0.5),0_8px_24px_rgba(0,0,0,0.4)] hover:from-[rgb(0,220,255)] hover:to-[rgb(0,190,230)] focus-visible:ring-[rgb(0,212,255)]":
              variant === "primary",
            "liquid-glass text-white hover:bg-[rgba(255,255,255,0.15)] focus-visible:ring-white/50":
              variant === "secondary",
            "border border-[rgba(255,255,255,0.2)] bg-transparent text-white/90 hover:bg-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.3)] focus-visible:ring-white/50":
              variant === "outline",
            "text-white/70 hover:text-white hover:bg-[rgba(255,255,255,0.1)] focus-visible:ring-white/50":
              variant === "ghost",
            "bg-gradient-to-b from-red-500 to-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.3),0_4px_16px_rgba(0,0,0,0.3)] hover:from-red-400 hover:to-red-500 focus-visible:ring-red-500":
              variant === "danger",
            "px-4 py-2 text-sm gap-1.5": size === "sm",
            "px-5 py-2.5 text-base gap-2": size === "md",
            "px-8 py-4 text-lg gap-2.5": size === "lg",
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
