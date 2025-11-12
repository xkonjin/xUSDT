/**
 * ToyIcons Component
 * 
 * Renders Airbnb-style 3D isometric icons for all toy types in the game.
 * Uses SVG with isometric perspective, soft shadows, and pastel colors
 * to match Airbnb's 2025 design aesthetic.
 * 
 * All icons are optimized for mobile viewing and touch interactions.
 */

"use client";

import React from "react";
import { TOY_CATALOG } from "../../lib/toys";

interface ToyIconProps {
  /** Icon name matching toy catalog iconName */
  name: string;
  /** Size in pixels */
  size?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Airbnb-style 3D isometric icon renderer for toys
 * 
 * Characteristics:
 * - 30° isometric perspective for depth
 * - Soft shadows and highlights for clay-like texture
 * - Pastel color palette
 * - Minimalistic details with subtle depth
 * - Mobile-optimized sizing
 */
export function ToyIcon({ name, size = 80, className = "" }: ToyIconProps) {
  // Render different icons based on toy name
  const renderIcon = () => {
    const iconSize = size;
    const viewBox = "0 0 100 100";
    
    // Common shadow pattern for all icons
    const baseShadow = (
      <ellipse cx="50" cy="85" rx="35" ry="8" fill="rgba(0,0,0,0.1)" />
    );
    
    switch (name) {
      case "robot":
        return (
          <svg
            width={iconSize}
            height={iconSize}
            viewBox={viewBox}
            xmlns="http://www.w3.org/2000/svg"
            style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }}
          >
            {baseShadow}
            <g transform="translate(50,45)">
              {/* Robot body - isometric cube */}
              <path d="M -15,-20 L 15,-20 L 20,-5 L 20,15 L -20,15 L -25,0 L -15,-20 Z" fill="#767676" stroke="#A8A8A8" strokeWidth="1.5" />
              <path d="M -15,-20 L 15,-20 L 10,-30 L -10,-30 Z" fill="#A8A8A8" opacity="0.8" />
              <path d="M 15,-20 L 20,-5 L 20,15 L 15,0 Z" fill="#8E8E8E" opacity="0.7" />
              {/* Robot head */}
              <rect x="-8" y="-30" width="16" height="12" fill="#FF5A5F" rx="2" />
              {/* Robot eyes */}
              <circle cx="-4" cy="-24" r="2" fill="#00A699" />
              <circle cx="4" cy="-24" r="2" fill="#00A699" />
              {/* Highlight */}
              <ellipse cx="-8" cy="-18" rx="6" ry="8" fill="rgba(255,255,255,0.3)" />
            </g>
          </svg>
        );

      case "teddy-bear":
        return (
          <svg width={iconSize} height={iconSize} viewBox={viewBox} xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }}>
            {baseShadow}
            <g transform="translate(50,50)">
              {/* Bear body */}
              <ellipse cx="0" cy="5" rx="18" ry="20" fill="#D4A574" stroke="#C89563" strokeWidth="1.5" />
              {/* Bear head */}
              <circle cx="0" cy="-15" r="12" fill="#D4A574" />
              {/* Ears */}
              <circle cx="-10" cy="-20" r="5" fill="#C89563" />
              <circle cx="10" cy="-20" r="5" fill="#C89563" />
              {/* Face */}
              <ellipse cx="-4" cy="-12" rx="2" ry="3" fill="#8B4513" />
              <ellipse cx="4" cy="-12" rx="2" ry="3" fill="#8B4513" />
              <ellipse cx="0" cy="-8" rx="3" ry="2" fill="#8B4513" />
              {/* Highlight */}
              <ellipse cx="-5" cy="-18" rx="4" ry="6" fill="rgba(255,255,255,0.3)" />
            </g>
          </svg>
        );

      case "race-car":
        return (
          <svg width={iconSize} height={iconSize} viewBox={viewBox} xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }}>
            {baseShadow}
            <g transform="translate(50,50)">
              {/* Car body */}
              <path d="M -20,-10 L 20,-10 L 25,0 L 20,10 L -20,10 L -25,0 Z" fill="#FF5A5F" stroke="#FF8A8F" strokeWidth="1.5" />
              <path d="M -20,-10 L 20,-10 L 15,-20 L -15,-20 Z" fill="#FF8A8F" opacity="0.8" />
              {/* Wheels */}
              <circle cx="-12" cy="8" r="5" fill="#333" />
              <circle cx="12" cy="8" r="5" fill="#333" />
              {/* Windshield */}
              <path d="M -5,-8 L 5,-8 L 8,-2 L -8,-2 Z" fill="#66D4C7" opacity="0.6" />
              {/* Highlight */}
              <ellipse cx="-8" cy="-12" rx="6" ry="8" fill="rgba(255,255,255,0.3)" />
            </g>
          </svg>
        );

      case "magic-wand":
        return (
          <svg width={iconSize} height={iconSize} viewBox={viewBox} xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }}>
            {baseShadow}
            <g transform="translate(50,50)">
              {/* Wand stick */}
              <rect x="-2" y="-25" width="4" height="35" fill="#8B4513" rx="2" />
              {/* Star tip */}
              <path d="M 0,-30 L 3,-25 L 8,-25 L 4,-22 L 6,-17 L 0,-20 L -6,-17 L -4,-22 L -8,-25 L -3,-25 Z" fill="#FFD700" />
              {/* Magic sparkles */}
              <circle cx="-8" cy="-15" r="2" fill="#00A699" opacity="0.8" />
              <circle cx="8" cy="-10" r="1.5" fill="#FF5A5F" opacity="0.8" />
              <circle cx="0" cy="5" r="2" fill="#FFD700" opacity="0.6" />
            </g>
          </svg>
        );

      case "space-ship":
        return (
          <svg width={iconSize} height={iconSize} viewBox={viewBox} xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }}>
            {baseShadow}
            <g transform="translate(50,50)">
              {/* Ship body */}
              <path d="M 0,-25 L 15,-10 L 15,5 L 0,15 L -15,5 L -15,-10 Z" fill="#00A699" stroke="#66D4C7" strokeWidth="1.5" />
              <path d="M 0,-25 L 10,-35 L -10,-35 Z" fill="#66D4C7" opacity="0.8" />
              {/* Windows */}
              <circle cx="-5" cy="-5" r="3" fill="#FFD700" opacity="0.7" />
              <circle cx="5" cy="-5" r="3" fill="#FFD700" opacity="0.7" />
              {/* Highlight */}
              <ellipse cx="-5" cy="-20" rx="6" ry="8" fill="rgba(255,255,255,0.3)" />
            </g>
          </svg>
        );

      case "dragon":
        return (
          <svg width={iconSize} height={iconSize} viewBox={viewBox} xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }}>
            {baseShadow}
            <g transform="translate(50,50)">
              {/* Dragon body */}
              <ellipse cx="0" cy="0" rx="18" ry="15" fill="#FF5A5F" stroke="#FF8A8F" strokeWidth="1.5" />
              {/* Dragon head */}
              <ellipse cx="0" cy="-18" rx="12" ry="10" fill="#FF5A5F" />
              {/* Wings */}
              <path d="M -15,-5 L -25,-15 L -20,-20 L -10,-10 Z" fill="#FF8A8F" opacity="0.8" />
              <path d="M 15,-5 L 25,-15 L 20,-20 L 10,-10 Z" fill="#FF8A8F" opacity="0.8" />
              {/* Eyes */}
              <circle cx="-3" cy="-20" r="2" fill="#FFD700" />
              <circle cx="3" cy="-20" r="2" fill="#FFD700" />
              {/* Highlight */}
              <ellipse cx="-5" cy="-15" rx="5" ry="7" fill="rgba(255,255,255,0.3)" />
            </g>
          </svg>
        );

      case "unicorn":
        return (
          <svg width={iconSize} height={iconSize} viewBox={viewBox} xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }}>
            {baseShadow}
            <g transform="translate(50,50)">
              {/* Unicorn body */}
              <ellipse cx="0" cy="5" rx="15" ry="18" fill="#FFD3D5" stroke="#FFB4B8" strokeWidth="1.5" />
              {/* Head */}
              <ellipse cx="0" cy="-12" rx="10" ry="12" fill="#FFD3D5" />
              {/* Horn */}
              <path d="M 0,-22 L 2,-30 L -2,-30 Z" fill="#FFD700" />
              {/* Mane */}
              <path d="M -8,-15 Q -12,-20 -10,-25 Q -8,-20 -8,-15" fill="#FF5A5F" opacity="0.7" />
              <path d="M 8,-15 Q 12,-20 10,-25 Q 8,-20 8,-15" fill="#FF5A5F" opacity="0.7" />
              {/* Eyes */}
              <circle cx="-3" cy="-10" r="1.5" fill="#333" />
              <circle cx="3" cy="-10" r="1.5" fill="#333" />
              {/* Highlight */}
              <ellipse cx="-4" cy="-8" rx="4" ry="6" fill="rgba(255,255,255,0.3)" />
            </g>
          </svg>
        );

      case "pirate-ship":
        return (
          <svg width={iconSize} height={iconSize} viewBox={viewBox} xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }}>
            {baseShadow}
            <g transform="translate(50,50)">
              {/* Ship hull */}
              <path d="M -20,10 L 20,10 L 18,5 L -18,5 Z" fill="#8B4513" />
              <path d="M -18,5 L 18,5 L 15,-5 L -15,-5 Z" fill="#A0522D" />
              {/* Mast */}
              <rect x="-1" y="-20" width="2" height="25" fill="#654321" />
              {/* Sail */}
              <path d="M 1,-20 L 1,-5 L 12,-10 L 12,-20 Z" fill="#F5F5DC" />
              {/* Flag */}
              <path d="M 1,-20 L 8,-25 L 1,-22 Z" fill="#FF5A5F" />
              {/* Highlight */}
              <ellipse cx="-8" cy="0" rx="6" ry="8" fill="rgba(255,255,255,0.2)" />
            </g>
          </svg>
        );

      case "castle":
        return (
          <svg width={iconSize} height={iconSize} viewBox={viewBox} xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }}>
            {baseShadow}
            <g transform="translate(50,50)">
              {/* Castle base */}
              <rect x="-18" y="0" width="36" height="20" fill="#767676" stroke="#A8A8A8" strokeWidth="1.5" />
              {/* Tower left */}
              <rect x="-18" y="-15" width="12" height="15" fill="#8E8E8E" />
              <path d="M -18,-15 L -12,-25 L -6,-15 Z" fill="#A8A8A8" />
              {/* Tower right */}
              <rect x="6" y="-15" width="12" height="15" fill="#8E8E8E" />
              <path d="M 6,-15 L 12,-25 L 18,-15 Z" fill="#A8A8A8" />
              {/* Center tower */}
              <rect x="-6" y="-20" width="12" height="20" fill="#8E8E8E" />
              <path d="M -6,-20 L 0,-30 L 6,-20 Z" fill="#A8A8A8" />
              {/* Door */}
              <rect x="-4" y="5" width="8" height="10" fill="#654321" />
              {/* Windows */}
              <rect x="-14" y="-8" width="4" height="4" fill="#FFD700" opacity="0.7" />
              <rect x="10" y="-8" width="4" height="4" fill="#FFD700" opacity="0.7" />
            </g>
          </svg>
        );

      case "treasure-chest":
        return (
          <svg width={iconSize} height={iconSize} viewBox={viewBox} xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }}>
            {baseShadow}
            <g transform="translate(50,50)">
              {/* Chest body */}
              <rect x="-18" y="-5" width="36" height="15" fill="#FFD700" stroke="#FFA500" strokeWidth="1.5" rx="2" />
              {/* Chest lid */}
              <path d="M -18,-5 L 18,-5 L 15,-12 L -15,-12 Z" fill="#FFA500" opacity="0.9" />
              {/* Lock */}
              <circle cx="0" cy="2" r="4" fill="#654321" />
              <rect x="-1" y="0" width="2" height="4" fill="#654321" />
              {/* Decorative lines */}
              <line x1="-12" y1="-2" x2="12" y2="-2" stroke="#FFA500" strokeWidth="1" />
              <line x1="-12" y1="5" x2="12" y2="5" stroke="#FFA500" strokeWidth="1" />
            </g>
          </svg>
        );

      case "ninja":
        return (
          <svg width={iconSize} height={iconSize} viewBox={viewBox} xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }}>
            {baseShadow}
            <g transform="translate(50,50)">
              {/* Ninja body */}
              <ellipse cx="0" cy="5" rx="12" ry="18" fill="#333" stroke="#555" strokeWidth="1.5" />
              {/* Head */}
              <circle cx="0" cy="-10" r="8" fill="#333" />
              {/* Mask */}
              <rect x="-6" y="-8" width="12" height="6" fill="#000" rx="3" />
              {/* Eyes */}
              <rect x="-3" y="-6" width="2" height="2" fill="#00A699" />
              <rect x="1" y="-6" width="2" height="2" fill="#00A699" />
              {/* Sword */}
              <line x1="12" y1="-5" x2="20" y2="-15" stroke="#767676" strokeWidth="2" />
              {/* Highlight */}
              <ellipse cx="-4" cy="-5" rx="3" ry="5" fill="rgba(255,255,255,0.2)" />
            </g>
          </svg>
        );

      case "wizard":
        return (
          <svg width={iconSize} height={iconSize} viewBox={viewBox} xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }}>
            {baseShadow}
            <g transform="translate(50,50)">
              {/* Wizard robe */}
              <path d="M -12,-20 L 12,-20 L 15,10 L -15,10 Z" fill="#6600CC" stroke="#8800FF" strokeWidth="1.5" />
              {/* Hat */}
              <path d="M -8,-20 L 8,-20 L 6,-30 L -6,-30 Z" fill="#330066" />
              <circle cx="0" cy="-32" r="3" fill="#FFD700" />
              {/* Beard */}
              <path d="M -6,-5 Q 0,-10 6,-5 Q 0,-15 -6,-5" fill="#FFD700" opacity="0.8" />
              {/* Staff */}
              <line x1="-15" y1="0" x2="-20" y2="-15" stroke="#8B4513" strokeWidth="2" />
              <circle cx="-20" cy="-15" r="3" fill="#FFD700" />
              {/* Magic sparkles */}
              <circle cx="10" cy="-10" r="2" fill="#00A699" opacity="0.8" />
              <circle cx="-10" cy="-5" r="1.5" fill="#FF5A5F" opacity="0.8" />
            </g>
          </svg>
        );

      case "knight":
        return (
          <svg width={iconSize} height={iconSize} viewBox={viewBox} xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }}>
            {baseShadow}
            <g transform="translate(50,50)">
              {/* Knight body */}
              <rect x="-10" y="-5" width="20" height="20" fill="#767676" stroke="#A8A8A8" strokeWidth="1.5" rx="2" />
              {/* Helmet */}
              <path d="M -8,-5 L 8,-5 L 6,-18 L -6,-18 Z" fill="#8E8E8E" />
              <path d="M -6,-18 L 6,-18 L 4,-22 L -4,-22 Z" fill="#A8A8A8" />
              {/* Visor */}
              <rect x="-4" y="-12" width="8" height="4" fill="#333" opacity="0.7" />
              {/* Shield */}
              <path d="M 10,-3 L 18,-3 L 18,7 L 10,7 Z" fill="#FF5A5F" />
              <path d="M 10,-3 L 18,-3 L 14,2 L 10,2 Z" fill="#FF8A8F" opacity="0.8" />
              {/* Sword */}
              <line x1="-10" y1="0" x2="-18" y2="-10" stroke="#C0C0C0" strokeWidth="2" />
            </g>
          </svg>
        );

      case "phoenix":
        return (
          <svg width={iconSize} height={iconSize} viewBox={viewBox} xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }}>
            {baseShadow}
            <g transform="translate(50,50)">
              {/* Phoenix body */}
              <ellipse cx="0" cy="0" rx="15" ry="12" fill="#FF5A5F" stroke="#FF8A8F" strokeWidth="1.5" />
              {/* Wings */}
              <path d="M -15,0 Q -25,-10 -20,-20 Q -10,-15 -15,0" fill="#FF8A8F" opacity="0.9" />
              <path d="M 15,0 Q 25,-10 20,-20 Q 10,-15 15,0" fill="#FF8A8F" opacity="0.9" />
              {/* Head */}
              <circle cx="0" cy="-15" r="8" fill="#FF5A5F" />
              {/* Beak */}
              <path d="M 0,-15 L 5,-20 L 0,-18 Z" fill="#FFD700" />
              {/* Tail feathers */}
              <path d="M 0,12 Q 5,18 0,22 Q -5,18 0,12" fill="#FFD700" opacity="0.8" />
              {/* Fire effect */}
              <path d="M 0,5 Q -3,10 0,15 Q 3,10 0,5" fill="#FFD700" opacity="0.6" />
            </g>
          </svg>
        );

      case "samurai":
        return (
          <svg width={iconSize} height={iconSize} viewBox={viewBox} xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }}>
            {baseShadow}
            <g transform="translate(50,50)">
              {/* Samurai body */}
              <rect x="-10" y="-5" width="20" height="20" fill="#FF5A5F" stroke="#FF8A8F" strokeWidth="1.5" rx="2" />
              {/* Head */}
              <circle cx="0" cy="-12" r="7" fill="#FFD3D5" />
              {/* Helmet */}
              <path d="M -7,-12 L 7,-12 L 5,-20 L -5,-20 Z" fill="#767676" />
              {/* Katana */}
              <line x1="10" y1="-5" x2="18" y2="-15" stroke="#C0C0C0" strokeWidth="2" />
              {/* Belt */}
              <rect x="-12" y="8" width="24" height="4" fill="#333" />
            </g>
          </svg>
        );

      case "mermaid":
        return (
          <svg width={iconSize} height={iconSize} viewBox={viewBox} xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }}>
            {baseShadow}
            <g transform="translate(50,50)">
              {/* Mermaid tail */}
              <path d="M 0,-10 Q -8,5 -10,15 Q 0,12 0,5 Q 8,5 10,15 Q 0,12 0,-10" fill="#00A699" stroke="#66D4C7" strokeWidth="1.5" />
              {/* Body */}
              <ellipse cx="0" cy="-5" rx="8" ry="10" fill="#FFD3D5" />
              {/* Head */}
              <circle cx="0" cy="-15" r="6" fill="#FFD3D5" />
              {/* Hair */}
              <path d="M -6,-15 Q -8,-20 -4,-18 Q 0,-22 4,-18 Q 8,-20 6,-15" fill="#FF5A5F" opacity="0.8" />
              {/* Crown */}
              <path d="M -4,-20 L 0,-25 L 4,-20 L 2,-18 L -2,-18 Z" fill="#FFD700" />
            </g>
          </svg>
        );

      case "golem":
        return (
          <svg width={iconSize} height={iconSize} viewBox={viewBox} xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }}>
            {baseShadow}
            <g transform="translate(50,50)">
              {/* Golem body */}
              <rect x="-15" y="-5" width="30" height="25" fill="#767676" stroke="#8E8E8E" strokeWidth="2" rx="3" />
              {/* Head */}
              <rect x="-10" y="-18" width="20" height="15" fill="#8E8E8E" rx="3" />
              {/* Eyes */}
              <rect x="-5" y="-12" width="3" height="3" fill="#FF5A5F" />
              <rect x="2" y="-12" width="3" height="3" fill="#FF5A5F" />
              {/* Arms */}
              <rect x="-20" y="0" width="8" height="15" fill="#8E8E8E" rx="2" />
              <rect x="12" y="0" width="8" height="15" fill="#8E8E8E" rx="2" />
              {/* Cracks/details */}
              <line x1="-8" y1="-8" x2="-5" y2="-5" stroke="#555" strokeWidth="1" />
              <line x1="5" y1="-8" x2="8" y2="-5" stroke="#555" strokeWidth="1" />
            </g>
          </svg>
        );

      case "fairy":
        return (
          <svg width={iconSize} height={iconSize} viewBox={viewBox} xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }}>
            {baseShadow}
            <g transform="translate(50,50)">
              {/* Fairy body */}
              <ellipse cx="0" cy="0" rx="6" ry="10" fill="#FFD3D5" />
              {/* Head */}
              <circle cx="0" cy="-8" r="5" fill="#FFD3D5" />
              {/* Wings */}
              <path d="M -8,-5 Q -12,-10 -8,-15 Q -4,-10 -8,-5" fill="#FFD3D5" opacity="0.7" />
              <path d="M 8,-5 Q 12,-10 8,-15 Q 4,-10 8,-5" fill="#FFD3D5" opacity="0.7" />
              {/* Wand */}
              <line x1="8" y1="-8" x2="15" y2="-15" stroke="#FFD700" strokeWidth="1.5" />
              <circle cx="15" cy="-15" r="2" fill="#FFD700" />
              {/* Sparkles */}
              <circle cx="-5" cy="-3" r="1" fill="#00A699" opacity="0.8" />
              <circle cx="5" cy="2" r="1" fill="#FF5A5F" opacity="0.8" />
            </g>
          </svg>
        );

      case "cyborg":
        return (
          <svg width={iconSize} height={iconSize} viewBox={viewBox} xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }}>
            {baseShadow}
            <g transform="translate(50,50)">
              {/* Cyborg body */}
              <rect x="-12" y="-5" width="24" height="20" fill="#00A699" stroke="#66D4C7" strokeWidth="1.5" rx="2" />
              {/* Head */}
              <rect x="-8" y="-18" width="16" height="15" fill="#767676" rx="3" />
              {/* Visor */}
              <rect x="-6" y="-15" width="12" height="8" fill="#00A699" opacity="0.6" />
              {/* Tech details */}
              <rect x="-10" y="0" width="4" height="8" fill="#FFD700" opacity="0.7" />
              <rect x="6" y="0" width="4" height="8" fill="#FFD700" opacity="0.7" />
              {/* Highlight */}
              <ellipse cx="-6" cy="-10" rx="4" ry="6" fill="rgba(255,255,255,0.3)" />
            </g>
          </svg>
        );

      case "crystal-ball":
        return (
          <svg width={iconSize} height={iconSize} viewBox={viewBox} xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }}>
            {baseShadow}
            <g transform="translate(50,50)">
              {/* Crystal ball */}
              <circle cx="0" cy="-5" r="12" fill="#00A699" stroke="#66D4C7" strokeWidth="1.5" opacity="0.8" />
              {/* Stand */}
              <path d="M -8,7 L 8,7 L 6,12 L -6,12 Z" fill="#654321" />
              {/* Magic inside */}
              <circle cx="-3" cy="-8" r="2" fill="#FFD700" opacity="0.6" />
              <circle cx="3" cy="-3" r="1.5" fill="#FF5A5F" opacity="0.6" />
              {/* Highlight */}
              <ellipse cx="-4" cy="-10" rx="5" ry="7" fill="rgba(255,255,255,0.4)" />
            </g>
          </svg>
        );

      default:
        // Default box icon for unknown toys
        return (
          <svg width={iconSize} height={iconSize} viewBox={viewBox} xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }}>
            {baseShadow}
            <g transform="translate(50,50)">
              <rect x="-20" y="-15" width="40" height="30" fill="#767676" stroke="#A8A8A8" strokeWidth="1.5" rx="3" />
              <path d="M -20,-15 L -10,-25 L 10,-25 L 20,-15 Z" fill="#A8A8A8" opacity="0.8" />
              <path d="M 20,-15 L 20,15 L 10,5 L 10,-25 Z" fill="#8E8E8E" opacity="0.7" />
              <ellipse cx="-8" cy="-10" rx="8" ry="10" fill="rgba(255,255,255,0.3)" />
            </g>
          </svg>
        );
    }
  };

  return (
    <div className={`toy-icon ${className}`} style={{ display: "inline-block", touchAction: "none" }}>
      {renderIcon()}
    </div>
  );
}

export default ToyIcon;

