"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalPortalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  zIndex?: number;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  containerClassName?: string;
  wrapperClassName?: string;
  backdropClassName?: string;
}

export function ModalPortal({
  children,
  isOpen,
  onClose,
  zIndex = 100,
  closeOnBackdrop = true,
  closeOnEscape = true,
  containerClassName = "",
  wrapperClassName = "",
  backdropClassName = "bg-black/70 backdrop-blur-sm animate-fade-in",
}: ModalPortalProps) {
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnEscape) {
        onClose();
      }
    },
    [onClose, closeOnEscape]
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;

    const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
      FOCUSABLE_SELECTOR
    );

    if (!focusableElements || focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";

      const timer = setTimeout(() => {
        const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
          FOCUSABLE_SELECTOR
        );
        firstFocusable?.focus();
      }, 50);

      return () => {
        clearTimeout(timer);
        document.removeEventListener("keydown", handleEscape);
        document.body.style.overflow = "";
      };
    } else {
      previousFocusRef.current?.focus();
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleEscape]);

  if (!mounted || !isOpen) return null;

  const modalContent = (
    <div
      className={`fixed inset-0 flex items-center justify-center p-4 ${containerClassName}`}
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`absolute inset-0 ${backdropClassName}`}
        onClick={closeOnBackdrop ? onClose : undefined}
        data-testid="modal-backdrop"
      />
      <div
        ref={modalRef}
        onKeyDown={handleKeyDown}
        className={`relative w-full max-w-md animate-fade-in-scale ${wrapperClassName}`}
      >
        {children}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

interface ModalContentProps {
  children: React.ReactNode;
  title?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
  className?: string;
}

export function ModalContent({
  children,
  title,
  onClose,
  showCloseButton = true,
  className = "",
}: ModalContentProps) {
  return (
    <div
      className={`bg-gradient-to-br from-white/[0.12] to-white/[0.06] backdrop-blur-xl border border-white/15 rounded-3xl p-6 ${className}`}
    >
      {(title || showCloseButton) && (
        <div className="flex items-center justify-between mb-6">
          {title && <h3 className="text-xl font-bold text-white">{title}</h3>}
          {showCloseButton && onClose && (
            <button
              onClick={onClose}
              className="text-white/50 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

export default ModalPortal;
