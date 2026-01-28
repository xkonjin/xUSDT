"use client";

import { useEffect, useState, ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalPortalProps {
  children: ReactNode;
  isOpen: boolean;
  onClose?: () => void;
  zIndex?: number;
  wrapperClassName?: string;
  closeOnBackdrop?: boolean;
  backdropClassName?: string;
}

export function ModalPortal({ children, isOpen, onClose, zIndex = 50, wrapperClassName, closeOnBackdrop = true, backdropClassName }: ModalPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Handle escape key to close modal
  useEffect(() => {
    if (!isOpen || !onClose) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex }}
    >
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm ${backdropClassName || ''}`}
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      <div className={`relative z-10 ${wrapperClassName || ''}`}>{children}</div>
    </div>,
    document.body
  );
}
