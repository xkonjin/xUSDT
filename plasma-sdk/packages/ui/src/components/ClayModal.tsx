"use client";

import { forwardRef, useEffect, useCallback, useId } from "react";
import { X } from "lucide-react";
import { cn } from "../lib/utils";

export interface ClayModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  children: React.ReactNode;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

const sizeStyles = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-full mx-4",
};

export const ClayModal = forwardRef<HTMLDivElement, ClayModalProps>(
  (
    {
      isOpen = false,
      onClose,
      title,
      description,
      size = "lg",
      children,
      showCloseButton = true,
      closeOnOverlayClick = true,
      closeOnEscape = true,
    },
    ref
  ) => {
    const titleId = useId();

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

    return (
      <div
        className="fixed inset-0 z-[1050] flex items-center justify-center p-4"
        aria-modal="true"
        role="dialog"
        aria-labelledby={title ? titleId : undefined}
      >
        {/* Backdrop */}
        <div
          className={cn(
            "absolute inset-0 bg-black/30 backdrop-blur-sm",
            "transition-opacity duration-300"
          )}
          onClick={closeOnOverlayClick ? onClose : undefined}
        />

        {/* Modal */}
        <div
          ref={ref}
          className={cn(
            "relative w-full",
            "bg-gradient-to-br from-white to-slate-100",
            "rounded-[2rem]",
            "shadow-clay-lg",
            "border border-slate-200/60",
            "max-h-[90vh] overflow-y-auto",
            "animate-in fade-in zoom-in-95 duration-300",
            sizeStyles[size]
          )}
        >
          {/* Header */}
          {(title || description || showCloseButton) && (
            <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-200/50">
              <div className="flex-1">
                {title && (
                  <h2
                    id={titleId}
                    className="text-2xl font-bold text-slate-800 mb-1"
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="text-sm text-slate-600">{description}</p>
                )}
              </div>
              {showCloseButton && onClose && (
                <button
                  onClick={onClose}
                  className={cn(
                    "flex-shrink-0 p-2 rounded-full",
                    "text-slate-400 hover:text-slate-600",
                    "transition-colors duration-200",
                    "hover:bg-slate-200/60"
                  )}
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="p-6">{children}</div>
        </div>
      </div>
    );
  }
);

ClayModal.displayName = "ClayModal";

export interface ClayModalFooterProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export const ClayModalFooter = forwardRef<HTMLDivElement, ClayModalFooterProps>(
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

ClayModalFooter.displayName = "ClayModalFooter";
