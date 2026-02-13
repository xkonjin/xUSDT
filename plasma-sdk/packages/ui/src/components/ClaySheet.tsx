"use client";

import { forwardRef, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "../lib/utils";

export interface ClaySheetProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onClose" | "children"> {
  isOpen?: boolean;
  onClose?: () => void;
  position?: "right" | "left" | "bottom";
  size?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

const positionStyles = {
  right: "fixed inset-y-0 right-0 h-full",
  left: "fixed inset-y-0 left-0 h-full",
  bottom: "fixed inset-x-0 bottom-0 w-full",
};

const sizeStyles = {
  sm: {
    right: "w-80",
    left: "w-80",
    bottom: "h-64",
  },
  md: {
    right: "w-96",
    left: "w-96",
    bottom: "h-80",
  },
  lg: {
    right: "w-[28rem]",
    left: "w-[28rem]",
    bottom: "h-[30rem]",
  },
  xl: {
    right: "w-[32rem]",
    left: "w-[32rem]",
    bottom: "h-[40rem]",
  },
};

export const ClaySheet = forwardRef<HTMLDivElement, ClaySheetProps>(
  (
    {
      isOpen = false,
      onClose,
      position = "right",
      size = "lg",
      children,
      className = "",
      showCloseButton = true,
      closeOnOverlayClick = true,
      closeOnEscape = true,
      ...props
    },
    ref
  ) => {
    // Handle escape key
    const handleEscape = useCallback(
      (e: KeyboardEvent) => {
        if (e.key === "Escape" && closeOnEscape && onClose) {
          onClose();
        }
      },
      [closeOnEscape, onClose]
    );

    useEffect(() => {
      if (isOpen) {
        document.addEventListener("keydown", handleEscape);
        document.body.style.overflow = "hidden";
      }

      return () => {
        document.removeEventListener("keydown", handleEscape);
        document.body.style.overflow = "";
      };
    }, [isOpen, handleEscape]);

    if (!isOpen) return null;

    const isHorizontal = position === "right" || position === "left";

    return (
      <div
        className="fixed inset-0 z-[1060] flex"
        aria-modal="true"
        role="dialog"
      >
        {/* Backdrop */}
        <div
          className={cn(
            "absolute inset-0 bg-black/30 backdrop-blur-sm",
            "transition-opacity duration-300"
          )}
          onClick={closeOnOverlayClick ? onClose : undefined}
        />

        {/* Sheet */}
        <div
          ref={ref}
          className={cn(
            "relative flex flex-col",
            "bg-gradient-to-br from-white to-slate-100",
            "shadow-clay-xl",
            "border",
            isHorizontal
              ? "border-l border-r border-slate-200/60 border-t border-b border-transparent"
              : "border-t border-b border-slate-200/60 border-l border-r border-transparent",
            isHorizontal ? "rounded-l-[2rem] rounded-r-none" : "rounded-t-[2rem] rounded-b-none",
            positionStyles[position],
            sizeStyles[size][position],
            "transition-transform duration-300",
            position === "right" && "animate-in slide-in-from-right",
            position === "left" && "animate-in slide-in-from-left",
            position === "bottom" && "animate-in slide-in-from-bottom",
            className
          )}
          {...props}
        >
          {/* Header */}
          {showCloseButton && onClose && (
            <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-200/50">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-800">Menu</h2>
              </div>
              <button
                onClick={onClose}
                className={cn(
                  "flex-shrink-0 p-2 rounded-full",
                  "text-slate-400 hover:text-slate-600",
                  "transition-colors duration-200",
                  "hover:bg-slate-200/60"
                )}
                aria-label="Close sheet"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
        </div>
      </div>
    );
  }
);

ClaySheet.displayName = "ClaySheet";

export interface ClaySheetFooterProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export const ClaySheetFooter = forwardRef<HTMLDivElement, ClaySheetFooterProps>(
  ({ className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-end gap-3 p-6 pt-4",
          "border-t border-slate-200/50",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ClaySheetFooter.displayName = "ClaySheetFooter";

