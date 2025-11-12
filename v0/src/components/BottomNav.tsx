/**
 * Bottom Navigation Component
 * 
 * Mobile-first bottom navigation bar for easy access to main features.
 * Only visible on mobile devices.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart2, Target, User } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/predictions", label: "Markets", icon: Target },
    { href: "/predictions/leaderboard", label: "Leaderboard", icon: BarChart2 },
    { href: "/predictions/my", label: "My Bets", icon: User },
  ];

  return (
    <nav className="xui-bottom-nav">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`xui-bottom-nav-link ${isActive ? "active" : ""}`}
          >
            <Icon className="xui-bottom-nav-icon" size={20} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default BottomNav;

