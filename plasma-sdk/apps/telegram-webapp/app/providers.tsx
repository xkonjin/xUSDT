"use client";

import { ReactNode, useEffect } from "react";
import { initPostHog } from "@/lib/posthog";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    initPostHog();
  }, []);

  return <>{children}</>;
}
