"use client";

import { memo } from "react";
import { motion } from "framer-motion";

interface OddsBarProps {
  yesPercent: number;
  showLabels?: boolean;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
}

function OddsBarComponent({ 
  yesPercent, 
  showLabels = true, 
  size = "md",
  animated = true 
}: OddsBarProps) {
  const noPercent = 100 - yesPercent;
  
  const heights = {
    sm: "h-1.5",
    md: "h-2",
    lg: "h-3",
  };

  const BarFill = animated ? motion.div : "div";
  
  return (
    <div className="w-full">
      {/* Labels */}
      {showLabels && (
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-purple-400">
              YES
            </span>
            <span className="text-sm font-bold text-white">
              {yesPercent}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">
              {noPercent}%
            </span>
            <span className="text-sm font-semibold text-gray-400">
              NO
            </span>
          </div>
        </div>
      )}
      
      {/* Bar Container */}
      <div className={`
        w-full ${heights[size]} rounded-full overflow-hidden
        bg-gray-600/30
        relative
      `}>
        {/* Yes Fill (Purple) */}
        <BarFill
          className="absolute left-0 top-0 h-full rounded-full"
          style={{
            background: "linear-gradient(90deg, #8B5CF6 0%, #a78bfa 100%)",
            boxShadow: "0 0 12px rgba(139, 92, 246, 0.5)",
          }}
          {...(animated ? {
            initial: { width: 0 },
            animate: { width: `${yesPercent}%` },
            transition: { duration: 0.6, ease: "easeOut" }
          } : {
            style: { 
              width: `${yesPercent}%`,
              background: "linear-gradient(90deg, #8B5CF6 0%, #a78bfa 100%)",
              boxShadow: "0 0 12px rgba(139, 92, 246, 0.5)",
            }
          })}
        />
        
        {/* Separator Line (only if both sides have meaningful percentages) */}
        {yesPercent > 5 && yesPercent < 95 && (
          <div 
            className="absolute top-0 h-full w-0.5 bg-white/30"
            style={{ left: `${yesPercent}%`, transform: "translateX(-50%)" }}
          />
        )}
      </div>
    </div>
  );
}

export const OddsBar = memo(OddsBarComponent);
OddsBar.displayName = "OddsBar";

// Compact inline version for tight spaces
interface OddsBarInlineProps {
  yesPercent: number;
}

function OddsBarInlineComponent({ yesPercent }: OddsBarInlineProps) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="font-semibold text-purple-400 min-w-[40px]">
        {yesPercent}%
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-gray-600/30 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-purple-400"
          initial={{ width: 0 }}
          animate={{ width: `${yesPercent}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <span className="font-semibold text-gray-400 min-w-[40px] text-right">
        {100 - yesPercent}%
      </span>
    </div>
  );
}

export const OddsBarInline = memo(OddsBarInlineComponent);
OddsBarInline.displayName = "OddsBarInline";
