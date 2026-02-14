"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  X,
  Loader2,
  User,
  ArrowUpRight,
  ArrowDownLeft,
  Link2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;
const MAX_RECENT_SEARCHES = 5;
const RECENT_SEARCHES_KEY = "plasma-venmo-recent-searches";

interface Contact {
  name: string;
  address: string;
  email?: string;
}

interface Transaction {
  id: string;
  type: "sent" | "received";
  amount: string;
  counterparty: string;
  memo?: string;
  timestamp: number;
  txHash: string;
}

interface PaymentLink {
  id: string;
  memo: string | null;
  amount: number | null;
  status: string;
  createdAt: string;
}

interface SearchResults {
  contacts: Contact[];
  transactions: Transaction[];
  links: PaymentLink[];
}

export interface SearchResult {
  type: "contact" | "transaction" | "link" | "recent";
  data: Contact | Transaction | PaymentLink | string;
}

interface SearchBarProps {
  address?: string;
  onSelect: (result: SearchResult) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({
  address,
  onSelect,
  placeholder = "Search...",
  className,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  const requestIdRef = useRef(0);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Save recent search
  const saveRecentSearch = useCallback(
    (term: string) => {
      const updated = [term, ...recentSearches.filter((s) => s !== term)].slice(
        0,
        MAX_RECENT_SEARCHES
      );
      setRecentSearches(updated);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // Ignore localStorage errors
      }
    },
    [recentSearches]
  );

  // Search function with race condition protection
  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < MIN_QUERY_LENGTH) {
        setResults(null);
        setLoading(false);
        return;
      }

      // Track this request to handle race conditions
      const thisRequestId = ++requestIdRef.current;

      setLoading(true);
      try {
        const url = new URL("/api/search", window.location.origin);
        url.searchParams.set("q", searchQuery);
        url.searchParams.set("type", "all");
        if (address) {
          url.searchParams.set("address", address);
        }

        const response = await fetch(url.toString());

        // Ignore stale responses from earlier requests
        if (thisRequestId !== requestIdRef.current) return;

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setResults(data.results);
          }
        }
      } catch (error) {
        // Only log if this is still the current request
        if (thisRequestId === requestIdRef.current) {
          console.error("Search error:", error);
        }
      } finally {
        // Only update loading if this is still the current request
        if (thisRequestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [address]
  );

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length >= MIN_QUERY_LENGTH) {
      debounceRef.current = setTimeout(() => {
        performSearch(query);
      }, DEBOUNCE_MS);
    } else {
      setResults(null);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, performSearch]);

  // Build flat list of all results for keyboard navigation
  const getAllItems = useCallback((): SearchResult[] => {
    const items: SearchResult[] = [];

    if (!query && recentSearches.length > 0) {
      recentSearches.forEach((term) => {
        items.push({ type: "recent", data: term });
      });
    }

    if (results) {
      results.contacts.forEach((contact) => {
        items.push({ type: "contact", data: contact });
      });
      results.transactions.forEach((tx) => {
        items.push({ type: "transaction", data: tx });
      });
      results.links.forEach((link) => {
        items.push({ type: "link", data: link });
      });
    }

    return items;
  }, [query, results, recentSearches]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = getAllItems();

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && items[selectedIndex]) {
          handleSelect(items[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle selection
  const handleSelect = (result: SearchResult) => {
    if (result.type === "recent") {
      setQuery(result.data as string);
      performSearch(result.data as string);
    } else {
      saveRecentSearch(query);
      onSelect(result);
      setQuery("");
      setIsOpen(false);
      setResults(null);
    }
    setSelectedIndex(-1);
  };

  // Handle focus
  const handleFocus = () => {
    setIsOpen(true);
  };

  // Handle blur (with delay to allow clicks on dropdown)
  const handleBlur = () => {
    setTimeout(() => {
      if (!dropdownRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    }, 150);
  };

  // Clear input
  const handleClear = () => {
    setQuery("");
    setResults(null);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const showDropdown =
    isOpen &&
    ((query.length >= MIN_QUERY_LENGTH && (loading || results)) ||
      (!query && recentSearches.length > 0));

  const total = results
    ? results.contacts.length +
      results.transactions.length +
      results.links.length
    : 0;

  return (
    <div className={cn("relative", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-plenmo-500/50 focus:ring-1 focus:ring-plenmo-500/25 transition-all"
        />
        {query && (
          <button
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-white/40" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full mt-2 left-0 right-0 bg-[rgb(var(--bg-elevated))] border border-white/[0.06] rounded-2xl shadow-xl overflow-hidden z-50 max-h-[400px] overflow-y-auto"
        >
          {loading && (
            <div
              className="flex items-center justify-center py-8"
              data-testid="search-loading"
            >
              <Loader2 className="w-5 h-5 text-plenmo-500 animate-spin" />
            </div>
          )}

          {!loading && !query && recentSearches.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-medium text-white/50 uppercase tracking-wider">
                Recent Searches
              </div>
              {recentSearches.map((term, index) => (
                <button
                  key={term}
                  onClick={() => handleSelect({ type: "recent", data: term })}
                  data-selected={selectedIndex === index}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left",
                    selectedIndex === index && "bg-white/10"
                  )}
                >
                  <Clock className="w-4 h-4 text-white/40" />
                  <span className="text-white/80">{term}</span>
                </button>
              ))}
            </div>
          )}

          {!loading && results && total === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-white/50">
              <Search className="w-8 h-8 mb-2 opacity-50" />
              <p>No results found for &quot;{query}&quot;</p>
            </div>
          )}

          {!loading && results && total > 0 && (
            <>
              {/* Contacts Section */}
              {results.contacts.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-medium text-white/50 uppercase tracking-wider bg-white/5">
                    Contacts
                  </div>
                  {results.contacts.map((contact, index) => {
                    const itemIndex = index;
                    return (
                      <button
                        key={contact.address}
                        onClick={() =>
                          handleSelect({ type: "contact", data: contact })
                        }
                        data-selected={selectedIndex === itemIndex}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left",
                          selectedIndex === itemIndex && "bg-white/10"
                        )}
                      >
                        <div className="w-8 h-8 rounded-full bg-plenmo-500/15 flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium truncate">
                            {contact.name}
                          </div>
                          {contact.email && (
                            <div className="text-white/40 text-sm truncate">
                              {contact.email}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Transactions Section */}
              {results.transactions.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-medium text-white/50 uppercase tracking-wider bg-white/5">
                    Transactions
                  </div>
                  {results.transactions.map((tx, index) => {
                    const itemIndex = results.contacts.length + index;
                    return (
                      <button
                        key={tx.id}
                        onClick={() =>
                          handleSelect({ type: "transaction", data: tx })
                        }
                        data-selected={selectedIndex === itemIndex}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left",
                          selectedIndex === itemIndex && "bg-white/10"
                        )}
                      >
                        <div
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center",
                            tx.type === "sent"
                              ? "bg-red-500/20"
                              : "bg-green-500/20"
                          )}
                        >
                          {tx.type === "sent" ? (
                            <ArrowUpRight className="w-4 h-4 text-red-400" />
                          ) : (
                            <ArrowDownLeft className="w-4 h-4 text-green-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium truncate">
                            {tx.memo ||
                              `${tx.type === "sent" ? "Sent to" : "From"} ${
                                tx.counterparty
                              }`}
                          </div>
                          <div className="text-white/40 text-sm">
                            ${tx.amount}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Payment Links Section */}
              {results.links.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-medium text-white/50 uppercase tracking-wider bg-white/5">
                    Payment Links
                  </div>
                  {results.links.map((link, index) => {
                    const itemIndex =
                      results.contacts.length +
                      results.transactions.length +
                      index;
                    return (
                      <button
                        key={link.id}
                        onClick={() =>
                          handleSelect({ type: "link", data: link })
                        }
                        data-selected={selectedIndex === itemIndex}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left",
                          selectedIndex === itemIndex && "bg-white/10"
                        )}
                      >
                        <div className="w-8 h-8 rounded-full bg-plenmo-500/20 flex items-center justify-center">
                          <Link2 className="w-4 h-4 text-plenmo-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium truncate">
                            {link.memo || "Payment Link"}
                          </div>
                          <div className="text-white/40 text-sm">
                            {link.amount
                              ? `$${link.amount.toFixed(2)}`
                              : "Any amount"}{" "}
                            • {link.status}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
