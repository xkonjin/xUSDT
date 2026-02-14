"use client";

import { Home, Clock, Send, User } from "lucide-react";

export type NavTab = "home" | "activity" | "send" | "profile";

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs: { id: NavTab; label: string; icon: typeof Home }[] = [
    { id: "home", label: "Home", icon: Home },
    { id: "activity", label: "Activity", icon: Clock },
    { id: "send", label: "Send", icon: Send },
    { id: "profile", label: "Profile", icon: User },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      aria-label="Main navigation"
    >
      <div
        className="flex items-center justify-around py-2 px-3 bg-[rgb(var(--bg-elevated))] border-t border-white/[0.06]"
        style={{
          paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;

          return (
            <button
              key={id}
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.vibrate) {
                  navigator.vibrate(10);
                }
                onTabChange(id);
              }}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 min-h-[44px] transition-colors duration-200 ${
                isActive ? "text-plenmo-500" : "text-white/30"
              }`}
            >
              <Icon
                className="w-5 h-5 transition-all duration-200"
                fill={isActive ? "currentColor" : "none"}
              />
              <span className="text-[10px] font-medium mt-0.5">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
