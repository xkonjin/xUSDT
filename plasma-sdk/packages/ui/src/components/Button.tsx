"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

const variantStyles = {
  primary: `
    bg-gradient-to-b from-[rgb(0,212,255)] to-[rgb(0,180,220)]
    text-black font-semibold
    shadow-[0_0_20px_rgba(0,212,255,0.4),0_4px_16px_rgba(0,0,0,0.3)]
    hover:shadow-[0_0_30px_rgba(0,212,255,0.5),0_8px_24px_rgba(0,0,0,0.4)]
    hover:from-[rgb(0,220,255)] hover:to-[rgb(0,190,230)]
    focus-visible:ring-[rgb(0,212,255)]
  `,
  secondary: `
    bg-white/10 backdrop-blur-md
    border border-white/15
    text-white
    hover:bg-white/15 hover:border-white/25
    focus-visible:ring-white/50
  `,
  outline: `
    border border-white/20 bg-transparent
    text-white/90
    hover:bg-white/10 hover:border-white/30
    focus-visible:ring-white/50
  `,
  ghost: `
    text-white/70
    hover:text-white hover:bg-white/10
    focus-visible:ring-white/50
  `,
  danger: `
    bg-gradient-to-b from-red-500 to-red-600
    text-white
    shadow-[0_0_20px_rgba(239,68,68,0.3),0_4px_16px_rgba(0,0,0,0.3)]
    hover:from-red-400 hover:to-red-500
    focus-visible:ring-red-500
  `,
};

const sizeStyles = {
  sm: "px-4 py-2 text-sm gap-1.5 rounded-xl",
  md: "px-5 py-2.5 text-base gap-2 rounded-2xl",
  lg: "px-8 py-4 text-lg gap-2.5 rounded-2xl",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
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
        className={`
          inline-flex items-center justify-center font-medium
          transition-all duration-300 ease-out
          focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black
          disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
          active:scale-[0.98]
          min-h-[44px]
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading...</span>
          </>
        ) : (
          <>
            {icon && iconPosition === "left" && icon}
            {children}
            {icon && iconPosition === "right" && icon}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
