/**
 * ProductIcon Component
 * 
 * Renders Airbnb-style 3D isometric icons for products.
 * Uses SVG with isometric perspective, soft shadows, and pastel colors
 * to match Airbnb's 2025 design aesthetic.
 */

"use client";

import React from "react";

interface ProductIconProps {
  /** Icon name (premium, vip-pass, default) */
  name: string;
  /** Size in pixels */
  size?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Airbnb-style 3D isometric icon renderer
 * 
 * Characteristics:
 * - 30° isometric perspective for depth
 * - Soft shadows and highlights for clay-like texture
 * - Pastel color palette
 * - Minimalistic details with subtle depth
 */
export function ProductIcon({ name, size = 80, className = "" }: ProductIconProps) {
  // Render different icons based on product name
  const renderIcon = () => {
    switch (name) {
      case "premium":
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
            style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }}
          >
            {/* Premium Star Icon - 3D Isometric Style */}
            {/* Base shadow layer */}
            <ellipse cx="50" cy="85" rx="35" ry="8" fill="rgba(0,0,0,0.1)" />
            
            {/* Main star body - isometric perspective */}
            <g transform="translate(50,50) rotate(-30)">
              {/* Front face */}
              <path
                d="M 0,-30 L 8,-10 L 28,-10 L 12,2 L 18,22 L 0,10 L -18,22 L -12,2 L -28,-10 L -8,-10 Z"
                fill="#FF5A5F"
                stroke="#FFB4B8"
                strokeWidth="1"
              />
              {/* Top face (isometric) */}
              <path
                d="M 0,-30 L 8,-10 L 0,-20 L -8,-10 Z"
                fill="#FFB4B8"
                opacity="0.8"
              />
              {/* Right side face */}
              <path
                d="M 8,-10 L 28,-10 L 18,22 L 0,10 Z"
                fill="#FF8A8F"
                opacity="0.7"
              />
              {/* Left side face */}
              <path
                d="M -8,-10 L -28,-10 L -18,22 L 0,10 Z"
                fill="#FF8A8F"
                opacity="0.5"
              />
              {/* Highlight */}
              <ellipse cx="-5" cy="-25" rx="8" ry="12" fill="rgba(255,255,255,0.3)" />
            </g>
          </svg>
        );

      case "vip-pass":
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
            style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }}
          >
            {/* VIP Badge Icon - 3D Isometric Style */}
            {/* Base shadow */}
            <ellipse cx="50" cy="85" rx="30" ry="7" fill="rgba(0,0,0,0.1)" />
            
            {/* Badge body - isometric perspective */}
            <g transform="translate(50,45)">
              {/* Front face */}
              <path
                d="M -20,-15 L 20,-15 L 25,0 L 20,15 L -20,15 L -25,0 Z"
                fill="#00A699"
                stroke="#66D4C7"
                strokeWidth="1.5"
              />
              {/* Top face (isometric) */}
              <path
                d="M -20,-15 L 20,-15 L 15,-25 L -15,-25 Z"
                fill="#66D4C7"
                opacity="0.8"
              />
              {/* Right side */}
              <path
                d="M 20,-15 L 25,0 L 20,15 L 15,0 Z"
                fill="#33B5A8"
                opacity="0.7"
              />
              {/* Left side */}
              <path
                d="M -20,-15 L -25,0 L -20,15 L -15,0 Z"
                fill="#33B5A8"
                opacity="0.5"
              />
              {/* Crown detail */}
              <path
                d="M -15,-20 L -5,-25 L 0,-20 L 5,-25 L 15,-20 L 10,-15 L -10,-15 Z"
                fill="#FFD700"
                opacity="0.9"
              />
              {/* Highlight */}
              <ellipse cx="-8" cy="-18" rx="6" ry="8" fill="rgba(255,255,255,0.3)" />
            </g>
          </svg>
        );

      case "default":
      default:
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
            style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }}
          >
            {/* Default Box Icon - 3D Isometric Style */}
            {/* Base shadow */}
            <ellipse cx="50" cy="85" rx="28" ry="6" fill="rgba(0,0,0,0.1)" />
            
            {/* Box body - isometric perspective */}
            <g transform="translate(50,50)">
              {/* Front face */}
              <rect
                x="-20"
                y="-15"
                width="40"
                height="30"
                fill="#767676"
                stroke="#A8A8A8"
                strokeWidth="1.5"
                rx="3"
              />
              {/* Top face (isometric) */}
              <path
                d="M -20,-15 L -10,-25 L 10,-25 L 20,-15 Z"
                fill="#A8A8A8"
                opacity="0.8"
              />
              {/* Right side */}
              <path
                d="M 20,-15 L 20,15 L 10,5 L 10,-25 Z"
                fill="#8E8E8E"
                opacity="0.7"
              />
              {/* Left side */}
              <path
                d="M -20,-15 L -20,15 L -10,5 L -10,-25 Z"
                fill="#8E8E8E"
                opacity="0.5"
              />
              {/* Highlight */}
              <ellipse cx="-8" cy="-10" rx="8" ry="10" fill="rgba(255,255,255,0.3)" />
            </g>
          </svg>
        );
    }
  };

  return (
    <div className={`product-icon ${className}`} style={{ display: "inline-block" }}>
      {renderIcon()}
    </div>
  );
}

export default ProductIcon;

