"use client";

import { forwardRef } from "react";
import { cn } from "../lib/utils";

export interface ClayContainerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl" | "full";
  centered?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const sizeStyles = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-full",
};

const paddingStyles = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

const ClayContainer = forwardRef<HTMLDivElement, ClayContainerProps>(
  ({ className = "", size = "lg", centered = true, padding = "md", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "w-full mx-auto",
          sizeStyles[size],
          centered ? "flex flex-col items-center" : "",
          paddingStyles[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ClayContainer.displayName = "ClayContainer";

export { ClayContainer };
