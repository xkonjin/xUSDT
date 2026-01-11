"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart2, Trophy, User } from "lucide-react";

const NAV_ITEMS = [
  { href: "/predictions", icon: Home, label: "Markets" },
  { href: "/my-bets", icon: BarChart2, label: "My Bets" },
  { href: "/leaderboard", icon: Trophy, label: "Leaders" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden liquid-glass border-t border-white/10 safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-4 py-2 touch-target
                ${isActive ? "text-prediction-primary" : "text-white/50"}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
