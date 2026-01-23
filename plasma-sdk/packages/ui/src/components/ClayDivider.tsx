"use client";

import { forwardRef } from "react";
import { cn } from "../lib/utils";

export interface ClayDividerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
  size?: "sm" | "md" | "lg";
  variant?: "default" | "primary" | "success" | "warning" | "danger";
  label?: string;
}

const orientationStyles = {
  horizontal: "w-full h-px",
  vertical: "h-full w-px",
};

const sizeStyles = {
  sm: "opacity-30",
  md: "opacity-50",
  lg: "opacity-70",
};

const variantStyles = {
  default:
    "bg-gradient-to-r from-transparent via-slate-300 to-transparent",
  primary:
    "bg-gradient-to-r from-transparent via-blue-400 to-transparent",
  success:
    "bg-gradient-to-r from-transparent via-emerald-400 to-transparent",
  warning:
    "bg-gradient-to-r from-transparent via-amber-400 to-transparent",
  danger:
    "bg-gradient-to-r from-transparent via-red-400 to-transparent",
};

const ClayDivider = forwardRef<HTMLDivElement, ClayDividerProps>(
  (
    {
      className = "",
      orientation = "horizontal",
      size = "md",
      variant = "default",
      label,
      ...props
    },
    ref
  ) => {
    const DividerComponent = (
      <div
        ref={ref}
        className={cn(
          "flex-shrink-0",
          orientationStyles[orientation],
          sizeStyles[size],
          variantStyles[variant],
          label && "flex items-center gap-4",
          className
        )}
        {...props}
      >
        {label && (
          <span className="text-sm font-semibold text-slate-500 bg-white/50 px-3 rounded-2xl shadow-clay-sm">
            {label}
          </span>
        )}
      </div>
    );

    return DividerComponent;
  }
);

ClayDivider.displayName = "ClayDivider";

export { ClayDivider };
