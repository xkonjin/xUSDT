"use client";

import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showRing?: boolean;
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-lg",
};

// Generate a consistent color based on name
function getAvatarColor(name: string): string {
  const colors = [
    "from-plenmo-500 to-plenmo-600",
    "from-emerald-500 to-emerald-600",
    "from-blue-500 to-blue-600",
    "from-purple-500 to-purple-600",
    "from-orange-500 to-orange-600",
    "from-pink-500 to-pink-600",
    "from-cyan-500 to-cyan-600",
    "from-amber-500 to-amber-600",
  ];
  
  // Simple hash based on name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({ name, src, size = "md", className, showRing = false }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const colorClass = getAvatarColor(name);

  if (src) {
    return (
      <div className={cn("relative", showRing && "p-0.5 rounded-full bg-gradient-to-br from-plenmo-500 to-plenmo-400")}>
        <img
          src={src}
          alt={name}
          className={cn(
            "rounded-full object-cover ring-2 ring-white/10",
            sizeClasses[size],
            className
          )}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative rounded-full bg-gradient-to-br flex items-center justify-center font-bold text-white shadow-lg",
        colorClass,
        sizeClasses[size],
        showRing && "ring-2 ring-white/20",
        className
      )}
      aria-label={name}
    >
      <span className="relative z-10">{initials || "?"}</span>
      {/* Subtle inner highlight */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 to-transparent opacity-50" />
    </div>
  );
}
