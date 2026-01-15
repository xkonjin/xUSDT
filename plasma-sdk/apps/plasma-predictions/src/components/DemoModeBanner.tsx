"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, X } from "lucide-react";
import { useDemoStore, formatDemoBalance } from "@/lib/demo-store";

export function DemoModeBanner() {
  const { isDemoMode, demoBalance, disableDemoMode } = useDemoStore();

  return (
    <AnimatePresence>
      {isDemoMode && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="bg-gradient-to-r from-[rgba(var(--accent-cyan),0.15)] via-[rgba(var(--accent-violet),0.1)] to-[rgba(var(--accent-cyan),0.15)] border-b border-[rgba(var(--accent-cyan),0.2)]">
            <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-[rgb(var(--accent-cyan))]" />
                <span className="font-semibold text-[rgb(var(--accent-cyan))]">
                  DEMO MODE
                </span>
              </div>
              
              <span className="text-white/60">•</span>
              
              <span className="text-white/80">
                {formatDemoBalance(demoBalance)} paper balance
              </span>
              
              <span className="text-white/60">•</span>
              
              <button
                onClick={disableDemoMode}
                className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors"
              >
                <span>Exit Demo</span>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
