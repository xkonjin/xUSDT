"use client";

import { forwardRef } from "react";
import { cn } from "../lib/utils";

export interface ClayCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "subtle";
  color?: "default" | "blue" | "pink" | "green" | "purple" | "yellow";
  padding?: "none" | "sm" | "md" | "lg";
  rounded?: "md" | "lg" | "xl" | "2xl" | "3xl";
  interactive?: boolean;
}

const colorStyles = {
  default: "from-white to-slate-100",
  blue: "from-blue-300 to-blue-400",
  pink: "from-pink-300 to-pink-400",
  green: "from-emerald-300 to-emerald-400",
  purple: "from-violet-300 to-violet-400",
  yellow: "from-amber-200 to-amber-300",
};

const variantStyles = {
  default: "shadow-clay",
  elevated: "shadow-clay-lg",
  subtle: "shadow-clay-sm",
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
  "3xl": "rounded-[2.5rem]",
};

const ClayCard = forwardRef<HTMLDivElement, ClayCardProps>(
  (
    {
      className = "",
      variant = "default",
      color = "default",
      padding = "md",
      rounded = "3xl",
      interactive = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-gradient-to-br",
          colorStyles[color],
          variantStyles[variant],
          paddingStyles[padding],
          roundedStyles[rounded],
          interactive &&
            "cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-clay-lg active:scale-[0.98]",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ClayCard.displayName = "ClayCard";

export interface ClayCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const ClayCardHeader = forwardRef<HTMLDivElement, ClayCardHeaderProps>(
  ({ className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex flex-col space-y-1.5 pb-4", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ClayCardHeader.displayName = "ClayCardHeader";

export interface ClayCardTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement> {}

const ClayCardTitle = forwardRef<HTMLHeadingElement, ClayCardTitleProps>(
  ({ className = "", children, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn("text-xl font-bold text-slate-800 tracking-tight", className)}
        {...props}
      >
        {children}
      </h3>
    );
  }
);

ClayCardTitle.displayName = "ClayCardTitle";

export interface ClayCardContentProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const ClayCardContent = forwardRef<HTMLDivElement, ClayCardContentProps>(
  ({ className = "", children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("", className)} {...props}>
        {children}
      </div>
    );
  }
);

ClayCardContent.displayName = "ClayCardContent";

export interface ClayCardFooterProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const ClayCardFooter = forwardRef<HTMLDivElement, ClayCardFooterProps>(
  ({ className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-center pt-4 mt-4 border-t border-slate-200/50", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ClayCardFooter.displayName = "ClayCardFooter";

export {
  ClayCard,
  ClayCardHeader,
  ClayCardTitle,
  ClayCardContent,
  ClayCardFooter,
};
