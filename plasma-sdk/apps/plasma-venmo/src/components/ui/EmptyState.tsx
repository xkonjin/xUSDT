"use client";

import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="relative mb-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center border border-white/5">
          <Icon className="w-7 h-7 text-white/40" />
        </div>
        {/* Subtle glow effect */}
        <div className="absolute inset-0 w-16 h-16 rounded-2xl bg-plenmo-500/10 blur-xl opacity-50" />
      </div>
      <h3 className="text-base font-semibold text-white mb-2 font-heading">{title}</h3>
      <p className="text-white/50 text-sm max-w-[240px] leading-relaxed font-body">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 px-5 py-2.5 rounded-xl bg-plenmo-500 text-black font-semibold text-sm hover:bg-plenmo-400 transition-all hover:shadow-lg hover:shadow-plenmo-500/20"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
