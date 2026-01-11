"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart3, Wallet, Trophy } from "lucide-react";
import { motion } from "framer-motion";

const NAV_ITEMS = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/predictions", icon: BarChart3, label: "Markets" },
  { href: "/my-bets", icon: Wallet, label: "My Bets" },
  { href: "/leaderboard", icon: Trophy, label: "Leaders" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
      {/* Blur backdrop */}
      <div className="absolute inset-0 bg-gradient-to-t from-[rgba(var(--bg-primary),0.98)] to-[rgba(var(--bg-primary),0.9)] backdrop-blur-xl border-t border-white/5" />
      
      <div className="relative safe-area-bottom">
        <div className="flex items-stretch justify-around px-2 h-16">
          {NAV_ITEMS.map((item) => {
            const isActive = 
              item.href === "/" 
                ? pathname === "/" 
                : pathname.startsWith(item.href);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex-1 flex flex-col items-center justify-center gap-1 py-2"
              >
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute -top-px left-1/2 -translate-x-1/2 w-12 h-0.5 rounded-full bg-gradient-to-r from-[rgb(var(--accent-cyan))] to-[rgb(var(--accent-violet))]"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                
                {/* Icon */}
                <div className={`relative ${isActive ? '' : ''}`}>
                  {isActive && (
                    <div className="absolute inset-0 bg-[rgb(var(--accent-cyan))] blur-lg opacity-30" />
                  )}
                  <item.icon
                    className={`relative w-5 h-5 transition-colors ${
                      isActive
                        ? "text-[rgb(var(--accent-cyan))]"
                        : "text-white/40"
                    }`}
                  />
                </div>
                
                {/* Label */}
                <span
                  className={`text-[10px] font-medium transition-colors ${
                    isActive ? "text-white" : "text-white/40"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
