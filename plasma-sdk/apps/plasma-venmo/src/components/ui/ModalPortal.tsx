"use client";

import { useEffect, useState, ReactNode, useCallback } from "react";
import { createPortal } from "react-dom";

interface ModalPortalProps {
  children: ReactNode;
  isOpen: boolean;
  onClose?: () => void;
  zIndex?: number;
  wrapperClassName?: string;
  closeOnBackdrop?: boolean;
  backdropClassName?: string;
  containerClassName?: string;
}

export function ModalPortal({ 
  children, 
  isOpen, 
  onClose, 
  zIndex = 50, 
  wrapperClassName, 
  closeOnBackdrop = true, 
  backdropClassName, 
  containerClassName 
}: ModalPortalProps) {
  const [mounted, setMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Handle open/close animations
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Small delay to trigger animation
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      setIsAnimating(false);
      // Wait for animation to complete before unmounting
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 200);
      // Restore body scroll
      document.body.style.overflow = '';
      return () => clearTimeout(timer);
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

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

  const handleBackdropClick = useCallback(() => {
    if (closeOnBackdrop && onClose) {
      onClose();
    }
  }, [closeOnBackdrop, onClose]);

  if (!mounted || !shouldRender) return null;

  return createPortal(
    <div 
      className={`fixed inset-0 flex items-center justify-center p-4 ${containerClassName || ''}`}
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop with fade animation */}
      <div 
        className={`
          absolute inset-0 bg-black/70 backdrop-blur-md
          transition-opacity duration-200 ease-out
          ${isAnimating ? 'opacity-100' : 'opacity-0'}
          ${backdropClassName || ''}
        `}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      
      {/* Content with scale and fade animation */}
      <div 
        className={`
          relative z-10 w-full
          transition-all duration-200 ease-out
          ${isAnimating 
            ? 'opacity-100 scale-100 translate-y-0' 
            : 'opacity-0 scale-95 translate-y-4'
          }
          ${wrapperClassName || 'max-w-md'}
        `}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
