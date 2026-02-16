"use client";

import { useEffect, useCallback } from "react";

interface ShortcutHandlers {
  onSend?: () => void; // Cmd+S or Ctrl+S
  onRequest?: () => void; // Cmd+R or Ctrl+R (prevent default browser refresh!)
  onAddFunds?: () => void; // Cmd+F or Ctrl+F (prevent default browser find!)
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Only handle when Cmd (Mac) or Ctrl (Win) is held
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
          handlers.onSend?.();
          break;
        case "r":
          e.preventDefault();
          handlers.onRequest?.();
          break;
        case "f":
          e.preventDefault();
          handlers.onAddFunds?.();
          break;
      }
    },
    [handlers]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
