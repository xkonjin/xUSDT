"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

export interface ClayButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "success" | "danger" | "ghost";
  size?: "sm" | "md" | "lg" | "xl";
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

const variantStyles = {
  primary: `
    from-blue-400 to-blue-500 text-white
    shadow-clay
    hover:shadow-clay-lg
    active:shadow-clay-pressed
  `,
  secondary: `
    from-slate-100 to-slate-200 text-slate-700
    shadow-clay-sm
    hover:shadow-clay
    active:shadow-clay-pressed
  `,
  success: `
    from-emerald-400 to-emerald-500 text-white
    shadow-clay-green
    hover:shadow-clay-green-hover
    active:shadow-clay-pressed
  `,
  danger: `
    from-red-400 to-red-500 text-white
    shadow-clay
    hover:shadow-clay-lg
    active:shadow-clay-pressed
  `,
  ghost: `
    from-slate-50 to-transparent text-slate-600
    border border-slate-200/50
    hover:from-slate-100 hover:to-slate-50
  `,
};

const sizeStyles = {
  sm: "px-4 py-2 text-sm rounded-2xl min-h-[36px]",
  md: "px-6 py-3 text-base rounded-3xl min-h-[44px]",
  lg: "px-8 py-4 text-lg rounded-3xl min-h-[52px]",
  xl: "px-10 py-5 text-xl rounded-3xl min-h-[60px]",
};

const ClayButton = forwardRef<HTMLButtonElement, ClayButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      loading,
      icon,
      iconPosition = "left",
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          "inline-flex items-center justify-center font-semibold",
          "bg-gradient-to-br",
          "transition-all duration-200 ease-out",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="ml-2">Loading...</span>
          </>
        ) : (
          <>
            {icon && iconPosition === "left" && (
              <span className="flex-shrink-0">{icon}</span>
            )}
            {children}
            {icon && iconPosition === "right" && (
              <span className="flex-shrink-0 ml-2">{icon}</span>
            )}
          </>
        )}
      </button>
    );
  }
);

ClayButton.displayName = "ClayButton";

export { ClayButton };
