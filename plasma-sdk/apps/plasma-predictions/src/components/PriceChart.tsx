"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import type { PriceSnapshot, TimeRange, PriceChange } from "@/lib/price-history";

interface PriceChartProps {
  marketId: string;
  currentPrice?: number;
  priceChange?: PriceChange;
  getHistoryForRange: (marketId: string, range: TimeRange) => PriceSnapshot[];
  height?: number;
}

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "1h", label: "1H" },
  { value: "24h", label: "24H" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
];

export function PriceChart({
  marketId,
  currentPrice,
  priceChange,
  getHistoryForRange,
  height = 200,
}: PriceChartProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>("24h");
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; data: PriceSnapshot } | null>(null);
  const chartRef = useRef<SVGSVGElement>(null);

  const data = useMemo(() => {
    return getHistoryForRange(marketId, selectedRange);
  }, [marketId, selectedRange, getHistoryForRange]);

  const { pathD, areaD, points, minPrice, maxPrice, isPositive } = useMemo(() => {
    if (data.length === 0) {
      return { pathD: "", areaD: "", points: [], minPrice: 0, maxPrice: 1, isPositive: true };
    }

    // Calculate trend
    const firstPrice = data[0].price;
    const lastPrice = data[data.length - 1].price;
    const isPositive = lastPrice >= firstPrice;

    // Find min and max prices for scaling with some padding
    const prices = data.map((d) => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 0.1;
    const paddedMin = minPrice - priceRange * 0.1;
    const paddedMax = maxPrice + priceRange * 0.1;
    const range = paddedMax - paddedMin;

    // Chart dimensions
    const padding = { left: 0, right: 0, top: 10, bottom: 10 };
    const chartWidth = 100; // Percentage based
    const chartHeight = height - padding.top - padding.bottom;

    // Generate points
    const points = data.map((snapshot, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * chartWidth;
      const y = padding.top + chartHeight - ((snapshot.price - paddedMin) / range) * chartHeight;
      return { x, y, data: snapshot };
    });

    // Build line path
    const pathD = points.reduce((acc, point, index) => {
      if (index === 0) {
        return `M ${point.x} ${point.y}`;
      }
      return `${acc} L ${point.x} ${point.y}`;
    }, "");

    // Build area path (for gradient fill)
    const areaD = points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`
      : "";

    return { pathD, areaD, points, minPrice, maxPrice, isPositive };
  }, [data, height]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!chartRef.current || points.length === 0) return;

    const rect = chartRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 100;

    // Find closest point
    let closestPoint = points[0];
    let closestDist = Math.abs(mouseX - points[0].x);

    for (const point of points) {
      const dist = Math.abs(mouseX - point.x);
      if (dist < closestDist) {
        closestDist = dist;
        closestPoint = point;
      }
    }

    setHoveredPoint(closestPoint);
  }, [points]);

  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null);
  }, []);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    if (selectedRange === "1h" || selectedRange === "24h") {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const strokeColor = isPositive ? "rgb(var(--yes-green))" : "rgb(var(--no-red))";
  const gradientId = `price-gradient-${marketId}`;

  return (
    <div className="w-full">
      {/* Header with price and time selector */}
      <div className="flex items-center justify-between mb-4">
        <div>
          {currentPrice !== undefined && (
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-white">
                {Math.round(currentPrice * 100)}%
              </span>
              {priceChange && (
                <span className={`text-sm font-medium ${priceChange.isPositive ? "text-yes" : "text-no"}`}>
                  {priceChange.isPositive ? "+" : ""}{priceChange.percent.toFixed(1)}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Time range selector */}
        <div className="flex gap-1 p-1 rounded-lg bg-white/5">
          {TIME_RANGES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSelectedRange(value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                selectedRange === value
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="relative" style={{ height }}>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white/40 text-sm">
            No data available
          </div>
        ) : (
          <>
            <svg
              ref={chartRef}
              data-testid="price-chart-svg"
              className="w-full h-full"
              viewBox={`0 0 100 ${height}`}
              preserveAspectRatio="none"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {/* Gradient definition */}
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1" data-testid="price-chart-gradient">
                  <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Area fill */}
              <path
                d={areaD}
                fill={`url(#${gradientId})`}
              />

              {/* Line */}
              <path
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Hover indicator line */}
              {hoveredPoint && (
                <line
                  x1={hoveredPoint.x}
                  y1={0}
                  x2={hoveredPoint.x}
                  y2={height}
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                  strokeDasharray="4 4"
                />
              )}

              {/* Hover point */}
              {hoveredPoint && (
                <circle
                  cx={hoveredPoint.x}
                  cy={hoveredPoint.y}
                  r="4"
                  fill={strokeColor}
                  stroke="white"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              )}

              {/* Hover area */}
              <rect
                data-testid="price-chart-hover-area"
                x="0"
                y="0"
                width="100"
                height={height}
                fill="transparent"
              />
            </svg>

            {/* Y-axis labels */}
            <div data-testid="price-chart-y-axis" className="absolute left-0 top-0 bottom-0 flex flex-col justify-between pointer-events-none py-2 text-xs text-white/40">
              <span>{Math.round(maxPrice * 100)}%</span>
              <span>{Math.round(minPrice * 100)}%</span>
            </div>

            {/* X-axis labels */}
            <div data-testid="price-chart-x-axis" className="absolute bottom-0 left-0 right-0 flex justify-between pointer-events-none text-xs text-white/40 -mb-6">
              {data.length > 0 && (
                <>
                  <span>{formatTime(data[0].timestamp)}</span>
                  <span>{formatTime(data[data.length - 1].timestamp)}</span>
                </>
              )}
            </div>

            {/* Tooltip */}
            {hoveredPoint && (
              <motion.div
                data-testid="price-chart-tooltip"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute pointer-events-none bg-white/10 backdrop-blur-md rounded-lg px-3 py-2 text-sm border border-white/10"
                style={{
                  left: `${hoveredPoint.x}%`,
                  top: Math.max(10, hoveredPoint.y - 50),
                  transform: "translateX(-50%)",
                }}
              >
                <div className="text-white font-medium">
                  {Math.round(hoveredPoint.data.price * 100)}%
                </div>
                <div className="text-white/50 text-xs">
                  {formatTime(hoveredPoint.data.timestamp)}
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
