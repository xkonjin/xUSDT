"use client";

import { forwardRef } from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "subtle" | "plasma" | "interactive";
  padding?: "none" | "sm" | "md" | "lg";
  rounded?: "md" | "lg" | "xl" | "2xl";
}

const variantStyles = {
  default: `
    bg-gradient-to-br from-white/[0.08] to-white/[0.04]
    backdrop-blur-md
    border border-white/10
    shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]
  `,
  elevated: `
    bg-gradient-to-br from-white/[0.12] to-white/[0.06]
    backdrop-blur-xl
    border border-white/15
    shadow-[0_16px_48px_rgba(0,0,0,0.4),0_4px_16px_rgba(0,212,255,0.1),inset_0_1px_0_rgba(255,255,255,0.15)]
  `,
  subtle: `
    bg-gradient-to-br from-white/[0.03] to-white/[0.01]
    backdrop-blur-sm
    border border-white/5
    shadow-[0_4px_16px_rgba(0,0,0,0.2)]
  `,
  plasma: `
    bg-gradient-to-br from-[rgba(0,212,255,0.15)] to-[rgba(0,212,255,0.08)]
    backdrop-blur-md
    border border-[rgba(0,212,255,0.25)]
    shadow-[0_8px_32px_rgba(0,212,255,0.1),inset_0_1px_0_rgba(255,255,255,0.1)]
  `,
  interactive: `
    bg-gradient-to-br from-white/[0.08] to-white/[0.04]
    backdrop-blur-md
    border border-white/10
    shadow-[0_8px_32px_rgba(0,0,0,0.3)]
    transition-all duration-200 cursor-pointer
    hover:bg-gradient-to-br hover:from-white/[0.12] hover:to-white/[0.06]
    hover:border-white/15
    hover:shadow-[0_16px_48px_rgba(0,0,0,0.4),0_4px_16px_rgba(0,212,255,0.1)]
    hover:-translate-y-1
    active:scale-[0.99]
  `,
};

const paddingStyles = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

const roundedStyles = {
  md: "rounded-xl",
  lg: "rounded-2xl",
  xl: "rounded-3xl",
  "2xl": "rounded-[2rem]",
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className = "",
      variant = "default",
      padding = "md",
      rounded = "2xl",
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={`
          ${variantStyles[variant]}
          ${paddingStyles[padding]}
          ${roundedStyles[rounded]}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex flex-col space-y-1.5 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardHeader.displayName = "CardHeader";

export interface CardTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement> {}

const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className = "", children, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={`text-xl font-semibold text-white tracking-tight ${className}`}
        {...props}
      >
        {children}
      </h3>
    );
  }
);

CardTitle.displayName = "CardTitle";

export interface CardContentProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className = "", children, ...props }, ref) => {
    return (
      <div ref={ref} className={`${className}`} {...props}>
        {children}
      </div>
    );
  }
);

CardContent.displayName = "CardContent";

export { Card, CardHeader, CardTitle, CardContent };
