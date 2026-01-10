"use client";

import { forwardRef } from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "plasma" | "success" | "warning" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
}

const variantStyles = {
  default: `
    bg-white/10 text-white/80
    border border-white/10
  `,
  plasma: `
    bg-[rgba(0,212,255,0.15)] text-[rgb(0,212,255)]
    border border-[rgba(0,212,255,0.3)]
  `,
  success: `
    bg-green-500/15 text-green-400
    border border-green-500/30
  `,
  warning: `
    bg-amber-500/15 text-amber-400
    border border-amber-500/30
  `,
  danger: `
    bg-red-500/15 text-red-400
    border border-red-500/30
  `,
  outline: `
    bg-transparent text-white/70
    border border-white/20
  `,
};

const sizeStyles = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
  lg: "px-3 py-1.5 text-base",
};

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = "", variant = "default", size = "md", children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`
          inline-flex items-center gap-1
          font-medium rounded-full
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export { Badge };
