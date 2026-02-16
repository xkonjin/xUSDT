"use client";

import { useEffect, useCallback, useRef } from "react";

interface ShortcutHandlers {
  onSend?: () => void; // Cmd+S or Ctrl+S
  onRequest?: () => void; // Cmd+R or Ctrl+R (prevent default browser refresh!)
  onAddFunds?: () => void; // Cmd+F or Ctrl+F (prevent default browser find!)
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isMod = e.metaKey || e.ctrlKey;
    if (!isMod) return;

    // Don't trigger when typing in inputs/textareas
    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      return;
    }

    switch (e.key.toLowerCase()) {
      case "s":
        e.preventDefault();
        handlersRef.current.onSend?.();
        break;
      case "r":
        e.preventDefault();
        handlersRef.current.onRequest?.();
        break;
      case "f":
        e.preventDefault();
        handlersRef.current.onAddFunds?.();
        break;
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
