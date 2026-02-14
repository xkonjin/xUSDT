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
      <div className="bottom-nav-bar">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          const isSend = id === "send";

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
              className={`bottom-nav-item ${isActive ? "active" : ""} ${
                isSend ? "send-btn" : ""
              } active:scale-95 transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black`}
            >
              <Icon
                className={`w-5 h-5 ${
                  isSend ? "w-6 h-6" : ""
                } transition-all duration-300`}
                fill={isActive ? "currentColor" : "none"}
              />
              <span className="text-[10px] font-semibold mt-0.5 transition-all duration-300">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
