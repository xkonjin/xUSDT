"use client";

import { forwardRef } from "react";
import { cn } from "../lib/utils";

export interface ClayBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  dot?: boolean;
}

const variantStyles = {
  default: `
    from-slate-100 to-slate-200 text-slate-700
    border border-slate-300/60
    shadow-clay-sm
  `,
  primary: `
    from-blue-100 to-blue-200 text-blue-700
    border border-blue-300/60
    shadow-clay-sm
  `,
  success: `
    from-emerald-100 to-emerald-200 text-emerald-700
    border border-emerald-300/60
    shadow-clay-sm
  `,
  warning: `
    from-amber-100 to-amber-200 text-amber-700
    border border-amber-300/60
    shadow-clay-sm
  `,
  danger: `
    from-red-100 to-red-200 text-red-700
    border border-red-300/60
    shadow-clay-sm
  `,
  outline: `
    from-transparent to-transparent text-slate-600
    border border-slate-300/80
  `,
};

const sizeStyles = {
  sm: "px-2.5 py-1 text-xs rounded-2xl min-h-[24px]",
  md: "px-3 py-1.5 text-sm rounded-2xl min-h-[28px]",
  lg: "px-4 py-2 text-base rounded-3xl min-h-[32px]",
};

const ClayBadge = forwardRef<HTMLSpanElement, ClayBadgeProps>(
  ({ className = "", variant = "default", size = "md", dot, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 font-semibold",
          "bg-gradient-to-br",
          variantStyles[variant],
          sizeStyles[size],
          dot ? "pr-2.5" : "",
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              "w-2 h-2 rounded-full flex-shrink-0",
              variant === "success" && "bg-emerald-500",
              variant === "warning" && "bg-amber-500",
              variant === "danger" && "bg-red-500",
              variant === "primary" && "bg-blue-500",
              (variant === "default" || variant === "outline") && "bg-slate-500"
            )}
          />
        )}
        {children}
      </span>
    );
  }
);

ClayBadge.displayName = "ClayBadge";

export { ClayBadge };
