"use client";

import { Search, X } from "lucide-react";
import { usePredictionStore } from "@/lib/store";

export function SearchBar() {
  const { searchQuery, setSearchQuery } = usePredictionStore();

  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
      <input
        type="text"
        placeholder="Search markets..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="input-glass w-full pl-12 pr-10"
      />
      {searchQuery && (
        <button
          onClick={() => setSearchQuery("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition"
        >
          <X className="w-4 h-4 text-white/40" />
        </button>
      )}
    </div>
  );
}
