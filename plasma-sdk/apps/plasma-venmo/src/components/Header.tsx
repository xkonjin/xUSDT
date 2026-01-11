"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, X } from "lucide-react";
import { SearchBar, SearchResult } from "./SearchBar";
import { QRCodeButton } from "./QRCode";
import { WalletManagerButton } from "./WalletManager";
import { UserProfileButton } from "./UserProfile";
import { cn } from "@/lib/utils";

interface HeaderProps {
  user?: { 
    email?: { address: string }; 
    phone?: { number: string };
    wallet?: { address: string };
  } | null;
  wallet?: { address: string } | null;
  onLogout: () => void;
  onSearchSelect: (result: SearchResult) => void;
  isDesktop?: boolean;
  className?: string;
}

export function Header({ 
  user, 
  wallet, 
  onLogout, 
  onSearchSelect,
  isDesktop = false,
  className 
}: HeaderProps) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isDesktopView, setIsDesktopView] = useState(isDesktop);

  // Check screen size
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktopView(window.matchMedia("(min-width: 768px)").matches);
    };
    
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  // Handle escape key to close mobile search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileSearchOpen) {
        setMobileSearchOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileSearchOpen]);

  const handleSearchSelect = useCallback((result: SearchResult) => {
    setMobileSearchOpen(false);
    onSearchSelect(result);
  }, [onSearchSelect]);

  const userEmail = user?.email?.address;

  return (
    <>
      <header className={cn("flex items-center justify-between mb-8 relative z-10", className)}>
        {/* Logo */}
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="gradient-text">Plasma</span>{" "}
          <span className="text-white">Venmo</span>
        </h1>

        {/* Desktop: Inline Search + Actions */}
        {(isDesktopView || isDesktop) && (
          <div className="flex items-center gap-4">
            <SearchBar
              address={wallet?.address}
              onSelect={handleSearchSelect}
              placeholder="Search contacts, transactions..."
              className="w-64"
            />
            <div className="flex items-center gap-2">
              <QRCodeButton walletAddress={wallet?.address} username={userEmail} />
              <WalletManagerButton />
              <UserProfileButton user={user ?? null} walletAddress={wallet?.address} onLogout={onLogout} />
            </div>
          </div>
        )}

        {/* Mobile: Search button + Actions */}
        {!isDesktopView && !isDesktop && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileSearchOpen(true)}
              aria-label="Open search"
              className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
            <QRCodeButton walletAddress={wallet?.address} username={userEmail} />
            <WalletManagerButton />
            <UserProfileButton user={user ?? null} walletAddress={wallet?.address} onLogout={onLogout} />
          </div>
        )}
      </header>

      {/* Mobile Search Panel */}
      {mobileSearchOpen && !isDesktopView && !isDesktop && (
        <div 
          data-testid="mobile-search-panel"
          className="fixed inset-x-0 top-0 z-50 bg-black/95 backdrop-blur-xl p-4 animate-slide-down"
        >
          <div className="flex items-center gap-3">
            <SearchBar
              address={wallet?.address}
              onSelect={handleSearchSelect}
              placeholder="Search contacts, transactions..."
              className="flex-1"
            />
            <button
              onClick={() => setMobileSearchOpen(false)}
              aria-label="Close search"
              className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
