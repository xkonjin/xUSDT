"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import { motion, HTMLMotionProps } from "framer-motion";

interface AccessibleButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children: ReactNode;
  ariaLabel?: string;
  ariaBusy?: boolean;
  ariaPressed?: boolean;
  variant?: "primary" | "secondary";
  loading?: boolean;
  loadingText?: string;
}

/**
 * Accessible button component with proper ARIA attributes
 * Meets WCAG 2.1 AA standards
 */
export function AccessibleButton({
  children,
  ariaLabel,
  ariaBusy = false,
  ariaPressed,
  variant = "primary",
  loading = false,
  loadingText = "Loading...",
  disabled,
  className = "",
  ...props
}: AccessibleButtonProps) {
  const baseClass = variant === "primary" ? "clay-button" : "clay-button-secondary";
  
  return (
    <motion.button
      whileHover={!disabled && !loading ? { y: -2 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      className={`${baseClass} ${className}`}
      aria-label={ariaLabel || (typeof children === "string" ? children : undefined)}
      aria-busy={ariaBusy || loading}
      aria-pressed={ariaPressed}
      aria-disabled={disabled || loading}
      disabled={disabled || loading}
      type="button"
      {...props}
    >
      {loading ? (
        <>
          <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" aria-hidden="true" />
          <span className="sr-only">{loadingText}</span>
          {loadingText}
        </>
      ) : (
        children
      )}
    </motion.button>
  );
}

export default AccessibleButton;
