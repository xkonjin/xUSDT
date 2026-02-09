"use client";

import { forwardRef, useId } from "react";
import { cn } from "../lib/utils";

export interface ClayInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizeStyles = {
  sm: "px-4 py-2 text-sm rounded-2xl min-h-[36px]",
  md: "px-5 py-3 text-base rounded-3xl min-h-[44px]",
  lg: "px-6 py-4 text-lg rounded-3xl min-h-[52px]",
};

const ClayInput = forwardRef<HTMLInputElement, ClayInputProps>(
  (
    {
      className = "",
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      size = "md",
      type = "text",
      id: externalId,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = externalId || generatedId;
    const hasError = !!error;
    const errorId = hasError ? `${inputId}-error` : undefined;
    const hintId = hint && !hasError ? `${inputId}-hint` : undefined;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-slate-700 mb-2 ml-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={type}
            aria-invalid={hasError || undefined}
            aria-describedby={errorId || hintId || undefined}
            className={cn(
              "w-full",
              "bg-gradient-to-br from-slate-50 to-slate-100",
              "border border-slate-300/60",
              "text-slate-800 placeholder:text-slate-400",
              "transition-all duration-200",
              "focus:outline-none",
              "shadow-clay-inset",
              "focus:border-blue-400/70",
              "focus:shadow-[inset_4px_4px_8px_rgba(163,177,198,0.4),inset_-4px_-4px_8px_rgba(255,255,255,0.9),0_0_0_3px_rgba(59,130,246,0.1)]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              leftIcon ? "pl-12" : "",
              rightIcon ? "pr-12" : "",
              hasError
                ? "border-red-400/70 focus:border-red-400 focus:shadow-[inset_4px_4px_8px_rgba(163,177,198,0.4),inset_-4px_-4px_8px_rgba(255,255,255,0.9),0_0_0_3px_rgba(239,68,68,0.1)]"
                : "",
              sizeStyles[size],
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p
            id={errorId}
            className="mt-2 text-sm text-red-500 font-medium ml-1 flex items-center gap-1"
          >
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-2 text-sm text-slate-500 ml-1">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

ClayInput.displayName = "ClayInput";

export { ClayInput };
