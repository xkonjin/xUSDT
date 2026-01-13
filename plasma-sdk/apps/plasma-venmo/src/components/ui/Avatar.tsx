"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-xl",
};

function getAvatarColor(name: string): string {
  const hash = name.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 50%)`;
}

function getInitials(name: string): string {
  if (!name) return "?";
  
  // Check if it's an email
  if (name.includes("@")) {
    return name.charAt(0).toUpperCase();
  }
  
  // Check if it's a wallet address
  if (name.startsWith("0x")) {
    return name.slice(2, 4).toUpperCase();
  }
  
  // Get initials from name
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const initials = getInitials(name);
  const bgColor = getAvatarColor(name);

  if (src) {
    return (
      <div
        className={cn(
          "rounded-full overflow-hidden flex-shrink-0",
          sizeClasses[size],
          className
        )}
        role="img"
        aria-label={`Avatar for ${name}`}
      >
        <Image
          src={src}
          alt={name}
          width={64}
          height={64}
          className="w-full h-full object-cover"
          unoptimized
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0",
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: bgColor }}
      role="img"
      aria-label={`Avatar for ${name}`}
    >
      {initials}
    </div>
  );
}

interface AvatarGroupProps {
  names: string[];
  max?: number;
  size?: "sm" | "md" | "lg";
}

export function AvatarGroup({ names, max = 3, size = "sm" }: AvatarGroupProps) {
  const visible = names.slice(0, max);
  const remaining = names.length - max;

  return (
    <div className="flex -space-x-2">
      {visible.map((name, i) => (
        <Avatar
          key={i}
          name={name}
          size={size}
          className="ring-2 ring-black"
        />
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            "rounded-full flex items-center justify-center font-semibold text-white bg-white/20 ring-2 ring-black",
            sizeClasses[size]
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
