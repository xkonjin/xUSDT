"use client";

import { useRef, useEffect } from "react";
import { MARKET_CATEGORIES } from "@/lib/constants";
import { usePredictionStore } from "@/lib/store";
import type { MarketCategory } from "@/lib/types";

export function CategoryTabs() {
  const { selectedCategory, setCategory } = usePredictionStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const active = activeRef.current;
      const scrollLeft =
        active.offsetLeft - container.offsetWidth / 2 + active.offsetWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }
  }, [selectedCategory]);

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4"
    >
      {MARKET_CATEGORIES.map((cat) => {
        const isActive = selectedCategory === cat.id;
        return (
          <button
            key={cat.id}
            ref={isActive ? activeRef : null}
            onClick={() => setCategory(cat.id as MarketCategory)}
            className={`category-tab ${isActive ? "active" : ""}`}
          >
            <span className="mr-1.5">{cat.emoji}</span>
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
