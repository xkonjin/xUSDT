"use client";

import { forwardRef } from "react";
import { cn } from "../lib/utils";

export interface ClaySectionProps
  extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl";
  centered?: boolean;
  variant?: "default" | "primary" | "secondary" | "accent";
}

const sizeStyles = {
  sm: "py-6 px-4",
  md: "py-8 px-6",
  lg: "py-12 px-8",
  xl: "py-16 px-10",
};

const variantStyles = {
  default: "bg-gradient-to-br from-slate-50 to-slate-100",
  primary: "bg-gradient-to-br from-blue-50 to-blue-100",
  secondary: "bg-gradient-to-br from-slate-100 to-slate-200",
  accent: "bg-gradient-to-br from-violet-50 to-violet-100",
};

const ClaySection = forwardRef<HTMLElement, ClaySectionProps>(
  (
    {
      className = "",
      title,
      description,
      size = "lg",
      centered = false,
      variant = "default",
      children,
      ...props
    },
    ref
  ) => {
    return (
      <section
        ref={ref}
        className={cn(
          "w-full",
          variantStyles[variant],
          sizeStyles[size],
          centered ? "text-center" : "",
          className
        )}
        {...props}
      >
        <div className="max-w-6xl mx-auto">
          {(title || description) && (
            <div className={cn("mb-8", centered ? "flex flex-col items-center" : "")}>
              {title && (
                <h2
                  className={cn(
                    "text-3xl md:text-4xl font-bold text-slate-800 mb-3",
                    "text-shadow-sm"
                  )}
                >
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-lg text-slate-600 max-w-2xl">
                  {description}
                </p>
              )}
            </div>
          )}
          {children}
        </div>
      </section>
    );
  }
);

ClaySection.displayName = "ClaySection";

export { ClaySection };
