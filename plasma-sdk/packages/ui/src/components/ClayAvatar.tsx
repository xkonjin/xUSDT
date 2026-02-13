"use client";

import Image from "next/image";
import { forwardRef } from "react";
import { cn } from "../lib/utils";

export interface ClayAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  status?: "online" | "offline" | "busy" | "away";
  rounded?: "full" | "2xl";
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-xl",
  "2xl": "w-20 h-20 text-2xl",
};

const roundedClasses = {
  full: "rounded-full",
  "2xl": "rounded-3xl",
};

const statusColors = {
  online: "bg-emerald-500",
  offline: "bg-slate-400",
  busy: "bg-red-500",
  away: "bg-amber-500",
};

function getAvatarColor(name: string): string {
  const hash = name.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 55%)`;
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

export const ClayAvatar = forwardRef<HTMLDivElement, ClayAvatarProps>(
  ({ name, src, size = "md", className, status, rounded = "full", ...props }, ref) => {
    const initials = getInitials(name);
    const bgColor = getAvatarColor(name);

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex-shrink-0",
          sizeClasses[size],
          roundedClasses[rounded],
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "w-full h-full flex items-center justify-center font-bold text-white shadow-clay-sm",
            roundedClasses[rounded]
          )}
          style={{ backgroundColor: bgColor }}
        >
          {src ? (
            <Image
              src={src}
              alt={name}
              width={64}
              height={64}
              className={cn(
                "w-full h-full object-cover",
                roundedClasses[rounded]
              )}
              unoptimized
            />
          ) : (
            <span className="drop-shadow-sm">{initials}</span>
          )}
        </div>
        {status && (
          <div
            className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white shadow-clay-sm",
              statusColors[status]
            )}
          />
        )}
      </div>
    );
  }
);

ClayAvatar.displayName = "ClayAvatar";

export interface ClayAvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  names: string[];
  srcs?: string[];
  max?: number;
  size?: "sm" | "md" | "lg";
  spacing?: "sm" | "md" | "lg";
}

const spacingClasses = {
  sm: "-space-x-3",
  md: "-space-x-4",
  lg: "-space-x-5",
};

export const ClayAvatarGroup = forwardRef<HTMLDivElement, ClayAvatarGroupProps>(
  (
    {
      names,
      srcs = [],
      max = 4,
      size = "md",
      spacing = "md",
      className = "",
      ...props
    },
    ref
  ) => {
    const visible = names.slice(0, max);
    const remaining = names.length - max;

    return (
      <div
        ref={ref}
        className={cn("flex", spacingClasses[spacing], className)}
        {...props}
      >
        {visible.map((name, i) => (
          <ClayAvatar
            key={i}
            name={name}
            src={srcs[i]}
            size={size}
            className="ring-3 ring-white shadow-clay-sm"
          />
        ))}
        {remaining > 0 && (
          <div
            className={cn(
              "rounded-full flex items-center justify-center font-bold text-slate-600 shadow-clay-sm ring-3 ring-white",
              sizeClasses[size]
            )}
          >
            +{remaining}
          </div>
        )}
      </div>
    );
  }
);

ClayAvatarGroup.displayName = "ClayAvatarGroup";
