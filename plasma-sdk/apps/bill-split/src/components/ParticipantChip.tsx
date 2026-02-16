"use client";

/**
 * ParticipantChip Component
 *
 * Colorful clay-style chip for displaying participants.
 * Used in bill splitting to show who's assigned to items.
 */

import { X, Check } from "lucide-react";

// Participant color palette matching tailwind config
export const PARTICIPANT_COLORS = [
  { name: "teal", bg: "#14b8a6", dark: "#0d9488" },
  { name: "coral", bg: "#fb7185", dark: "#f43f5e" },
  { name: "amber", bg: "#fbbf24", dark: "#f59e0b" },
  { name: "violet", bg: "#a78bfa", dark: "#8b5cf6" },
  { name: "emerald", bg: "#34d399", dark: "#10b981" },
  { name: "orange", bg: "#fb923c", dark: "#f97316" },
  { name: "pink", bg: "#f472b6", dark: "#ec4899" },
  { name: "sky", bg: "#38bdf8", dark: "#0ea5e9" },
] as const;

export type ParticipantColor = (typeof PARTICIPANT_COLORS)[number];

interface ParticipantChipProps {
  /** Participant's name */
  name: string;
  /** Color from the participant palette */
  color: ParticipantColor | string;
  /** Whether this chip is in the "active/selected" state */
  isActive?: boolean;
  /** Show check icon when active */
  showCheck?: boolean;
  /** Show remove button */
  showRemove?: boolean;
  /** Click handler for the chip */
  onClick?: () => void;
  /** Handler for remove button */
  onRemove?: () => void;
  /** Additional classes */
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
}

export function ParticipantChip({
  name,
  color,
  isActive = false,
  showCheck = false,
  showRemove = false,
  onClick,
  onRemove,
  className = "",
  size = "md",
}: ParticipantChipProps) {
  // Get color values
  const colorObj =
    typeof color === "string"
      ? PARTICIPANT_COLORS.find((c) => c.name === color || c.bg === color) ||
        PARTICIPANT_COLORS[0]
      : color;

  const bgColor = typeof colorObj === "object" ? colorObj.bg : colorObj;
  const darkColor = typeof colorObj === "object" ? colorObj.dark : colorObj;

  // Get initials
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Size classes
  const sizeClasses = {
    sm: "px-2.5 py-1 text-xs gap-1",
    md: "px-3 py-1.5 text-sm gap-1.5",
    lg: "px-4 py-2 text-base gap-2",
  };

  const avatarSizes = {
    sm: "w-5 h-5 text-[10px]",
    md: "w-6 h-6 text-xs",
    lg: "w-8 h-8 text-sm",
  };

  return (
    <button
      onClick={onClick}
      className={`
        participant-chip
        ${sizeClasses[size]}
        ${
          isActive
            ? "participant-chip-active text-white"
            : "participant-chip-inactive hover:bg-white/10"
        }
        ${className}
      `}
      style={
        isActive
          ? {
              background: `linear-gradient(145deg, ${bgColor} 0%, ${darkColor} 100%)`,
            }
          : undefined
      }
    >
      {/* Avatar with initials */}
      <span
        className={`
          ${avatarSizes[size]}
          rounded-full flex items-center justify-center
          font-semibold
          ${isActive ? "bg-white/20" : ""}
        `}
        style={
          !isActive
            ? {
                background: `linear-gradient(145deg, ${bgColor} 0%, ${darkColor} 100%)`,
                color: "white",
              }
            : undefined
        }
      >
        {initials}
      </span>

      {/* Name */}
      <span className="font-medium">{name}</span>

      {/* Check icon */}
      {showCheck && isActive && (
        <Check className={`${size === "sm" ? "w-3 h-3" : "w-4 h-4"}`} />
      )}

      {/* Remove button */}
      {showRemove && onRemove && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={`
            ${size === "sm" ? "w-4 h-4" : "w-5 h-5"}
            rounded-full flex items-center justify-center
            ${
              isActive
                ? "bg-white/20 hover:bg-white/30"
                : "bg-white/15 hover:bg-white/25"
            }
            transition-colors cursor-pointer ml-1
          `}
        >
          <X className={`${size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3"}`} />
        </span>
      )}
    </button>
  );
}

/**
 * ParticipantAvatar - Just the circular avatar portion
 */
interface ParticipantAvatarProps {
  name: string;
  color: ParticipantColor | string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function ParticipantAvatar({
  name,
  color,
  size = "md",
  className = "",
}: ParticipantAvatarProps) {
  const colorObj =
    typeof color === "string"
      ? PARTICIPANT_COLORS.find((c) => c.name === color || c.bg === color) ||
        PARTICIPANT_COLORS[0]
      : color;

  const bgColor = typeof colorObj === "object" ? colorObj.bg : colorObj;
  const darkColor = typeof colorObj === "object" ? colorObj.dark : colorObj;

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-xl",
  };

  return (
    <div
      className={`
        clay-avatar
        ${sizeClasses[size]}
        ${className}
      `}
      style={{
        background: `linear-gradient(145deg, ${bgColor} 0%, ${darkColor} 100%)`,
      }}
    >
      {initials}
    </div>
  );
}

/**
 * Get a color for a participant by index
 */
export function getParticipantColor(index: number): ParticipantColor {
  return PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length];
}

export default ParticipantChip;
