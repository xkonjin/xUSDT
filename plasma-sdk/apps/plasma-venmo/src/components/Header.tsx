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
  className,
}: HeaderProps) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isDesktopView, setIsDesktopView] = useState(isDesktop);
  const [scrolled, setScrolled] = useState(false);

  // Check screen size
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktopView(window.matchMedia("(min-width: 768px)").matches);
    };

    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  // Scroll-aware behavior
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
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

  const handleSearchSelect = useCallback(
    (result: SearchResult) => {
      setMobileSearchOpen(false);
      onSearchSelect(result);
    },
    [onSearchSelect]
  );

  const userEmail = user?.email?.address;

  return (
    <>
      <header
        className={cn(
          "flex items-center justify-between sticky top-0 z-10 transition-all duration-200",
          scrolled
            ? "bg-[rgb(var(--bg-primary))]/95 backdrop-blur-sm border-b border-white/[0.06] py-3 mb-4"
            : "py-4 mb-6",
          className
        )}
      >
        {/* Logo */}
        <h1 className="text-xl font-heading font-bold tracking-tight text-white cursor-default">
          Plenmo
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
              <QRCodeButton
                walletAddress={wallet?.address}
                username={userEmail}
              />
              <WalletManagerButton />
              <UserProfileButton
                user={user ?? null}
                walletAddress={wallet?.address}
                onLogout={onLogout}
              />
            </div>
          </div>
        )}

        {/* Mobile: Search button + Actions */}
        {!isDesktopView && !isDesktop && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileSearchOpen(true)}
              aria-label="Open search"
              className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 active:scale-95 transition-all duration-150"
            >
              <Search className="w-5 h-5" />
            </button>
            <QRCodeButton
              walletAddress={wallet?.address}
              username={userEmail}
            />
            <WalletManagerButton />
            <UserProfileButton
              user={user ?? null}
              walletAddress={wallet?.address}
              onLogout={onLogout}
            />
          </div>
        )}
      </header>

      {/* Mobile Search Panel */}
      {mobileSearchOpen && !isDesktopView && !isDesktop && (
        <div
          data-testid="mobile-search-panel"
          className="fixed inset-x-0 top-0 z-50 bg-[rgb(var(--bg-primary))] border-b border-white/[0.06] p-4 animate-slide-down"
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
              className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 active:scale-95 transition-all duration-150"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
