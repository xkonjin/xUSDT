"use client";

import { forwardRef } from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className = "",
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      type = "text",
      ...props
    },
    ref
  ) => {
    const hasError = !!error;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-white/70 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            type={type}
            className={`
              w-full
              bg-white/[0.05]
              backdrop-blur-sm
              border rounded-xl
              px-4 py-3
              text-white text-base
              placeholder:text-white/40
              transition-all duration-200
              min-h-[44px]
              focus:outline-none focus:bg-white/[0.08]
              disabled:opacity-50 disabled:cursor-not-allowed
              ${leftIcon ? "pl-11" : ""}
              ${rightIcon ? "pr-11" : ""}
              ${
                hasError
                  ? "border-red-500/50 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]"
                  : "border-white/10 focus:border-[rgba(0,212,255,0.5)] focus:shadow-[0_0_0_3px_rgba(0,212,255,0.1)]"
              }
              ${className}
            `}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        {hint && !error && (
          <p className="mt-2 text-sm text-white/40">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
