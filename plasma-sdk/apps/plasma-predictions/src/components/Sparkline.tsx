"use client";

import { useMemo } from "react";
import type { PriceSnapshot } from "@/lib/price-history";

interface SparklineProps {
  data: PriceSnapshot[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  className?: string;
}

export function Sparkline({
  data,
  width = 60,
  height = 24,
  strokeWidth = 1.5,
  className = "",
}: SparklineProps) {
  const { pathD, isPositive } = useMemo(() => {
    if (data.length === 0) {
      return { pathD: "", isPositive: true };
    }

    if (data.length === 1) {
      // Single point - draw a horizontal line
      return {
        pathD: `M 0 ${height / 2} L ${width} ${height / 2}`,
        isPositive: true,
      };
    }

    // Calculate trend (positive if last price > first price)
    const firstPrice = data[0].price;
    const lastPrice = data[data.length - 1].price;
    const isPositive = lastPrice >= firstPrice;

    // Find min and max prices for scaling
    const prices = data.map((d) => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1; // Avoid division by zero

    // Add padding to y-axis
    const padding = 2;
    const chartHeight = height - padding * 2;
    const chartWidth = width;

    // Generate path coordinates
    const points = data.map((snapshot, index) => {
      const x = (index / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((snapshot.price - minPrice) / priceRange) * chartHeight;
      return { x, y };
    });

    // Build SVG path
    const pathD = points.reduce((acc, point, index) => {
      if (index === 0) {
        return `M ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
      }
      return `${acc} L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    }, "");

    return { pathD, isPositive };
  }, [data, width, height]);

  const strokeClass = isPositive ? "stroke-yes" : "stroke-no";

  return (
    <svg
      data-testid="sparkline-svg"
      role="img"
      aria-label="Price trend sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`${className}`}
      preserveAspectRatio="none"
    >
      {pathD && (
        <path
          data-testid="sparkline-path"
          d={pathD}
          fill="none"
          className={strokeClass}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
