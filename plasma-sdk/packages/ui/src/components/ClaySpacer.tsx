"use client";

import { forwardRef } from "react";
import { cn } from "../lib/utils";

export interface ClaySpacerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
  axis?: "vertical" | "horizontal" | "both";
}

const sizeStyles = {
  xs: "0.5rem",  // 8px
  sm: "1rem",    // 16px
  md: "1.5rem",  // 24px
  lg: "2rem",    // 32px
  xl: "3rem",    // 48px
  "2xl": "4rem",   // 64px
  "3xl": "6rem",   // 96px
  "4xl": "8rem",   // 128px
  "5xl": "12rem",  // 192px
};

const axisStyles = {
  vertical: "w-0",
  horizontal: "h-0",
  both: "",
};

const ClaySpacer = forwardRef<HTMLDivElement, ClaySpacerProps>(
  ({ className = "", size = "md", axis = "vertical", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(axisStyles[axis], className)}
        style={{
          ...(axis === "vertical" || axis === "both" ? { height: sizeStyles[size] } : {}),
          ...(axis === "horizontal" || axis === "both" ? { width: sizeStyles[size] } : {}),
        }}
        {...props}
      />
    );
  }
);

ClaySpacer.displayName = "ClaySpacer";

export { ClaySpacer };
