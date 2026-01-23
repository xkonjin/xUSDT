"use client";

import { useEffect, useRef } from "react";

type LiveRegionProps = {
  message: string;
  politeness?: "polite" | "assertive";
  clearAfter?: number;
};

/**
 * Live region for screen reader announcements
 * Announces status updates without visual interruption
 */
export function LiveRegion({ 
  message, 
  politeness = "polite",
  clearAfter = 5000 
}: LiveRegionProps) {
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (clearAfter && message) {
      timeoutRef.current = setTimeout(() => {
        // Message will be cleared by parent component
      }, clearAfter);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [message, clearAfter]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

export default LiveRegion;
