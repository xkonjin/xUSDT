"use client";

import { useState, useEffect, memo } from "react";
import { Avatar } from "./ui/Avatar";
import { ArrowUpRight, ArrowDownLeft, Users } from "lucide-react";

interface ActivityItem {
  id: string;
  type: "sent" | "received";
  fromName: string;
  toName: string;
  amount: string;
  timestamp: number;
  isPublic: boolean;
}

// Simulated live feed data (in production, this would come from WebSocket/SSE)
const mockActivity: ActivityItem[] = [
  {
    id: "1",
    type: "sent",
    fromName: "Alex",
    toName: "Jordan",
    amount: "25.00",
    timestamp: Date.now() - 30000,
    isPublic: true,
  },
  {
    id: "2",
    type: "sent",
    fromName: "Sam",
    toName: "Riley",
    amount: "10.00",
    timestamp: Date.now() - 120000,
    isPublic: true,
  },
  {
    id: "3",
    type: "sent",
    fromName: "Casey",
    toName: "Morgan",
    amount: "50.00",
    timestamp: Date.now() - 300000,
    isPublic: true,
  },
];

interface LiveActivityFeedProps {
  className?: string;
  maxItems?: number;
}

export const LiveActivityFeed = memo(function LiveActivityFeed({
  className = "",
  maxItems = 3,
}: LiveActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setActivities(mockActivity.slice(0, maxItems));
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [maxItems]);

  // Simulate new activity coming in
  useEffect(() => {
    const interval = setInterval(() => {
      const names = [
        "Alex",
        "Jordan",
        "Sam",
        "Riley",
        "Casey",
        "Morgan",
        "Taylor",
        "Quinn",
      ];
      const amounts = ["5.00", "10.00", "15.00", "20.00", "25.00", "50.00"];

      const newActivity: ActivityItem = {
        id: Date.now().toString(),
        type: "sent",
        fromName: names[Math.floor(Math.random() * names.length)],
        toName: names[Math.floor(Math.random() * names.length)],
        amount: amounts[Math.floor(Math.random() * amounts.length)],
        timestamp: Date.now(),
        isPublic: true,
      };

      setActivities((prev) => [newActivity, ...prev.slice(0, maxItems - 1)]);
    }, 8000 + Math.random() * 7000); // Random interval 8-15s

    return () => clearInterval(interval);
  }, [maxItems]);

  function getRelativeTime(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 animate-pulse"
          >
            <div className="w-10 h-10 rounded-full bg-white/10" />
            <div className="flex-1">
              <div className="h-4 w-32 bg-white/10 rounded mb-2" />
              <div className="h-3 w-20 bg-white/10 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2 text-white/50 text-sm mb-3">
        <Users className="w-4 h-4" />
        <span>Live Activity</span>
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
      </div>

      {activities.map((activity, index) => (
        <div
          key={activity.id}
          className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-300 animate-slide-up"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="relative">
            <Avatar name={activity.fromName} size="sm" />
            <div
              className={`absolute -bottom-1 -right-1 p-0.5 rounded-full ${
                activity.type === "sent"
                  ? "bg-[rgb(0,212,255)]"
                  : "bg-green-500"
              }`}
            >
              {activity.type === "sent" ? (
                <ArrowUpRight className="w-2.5 h-2.5 text-black" />
              ) : (
                <ArrowDownLeft className="w-2.5 h-2.5 text-white" />
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-white/80 text-sm truncate">
              <span className="font-medium">{activity.fromName}</span>
              <span className="text-white/40"> paid </span>
              <span className="font-medium">{activity.toName}</span>
            </p>
            <p className="text-white/40 text-xs">
              {getRelativeTime(activity.timestamp)}
            </p>
          </div>

          <div className="text-[rgb(0,212,255)] font-semibold text-sm">
            ${activity.amount}
          </div>
        </div>
      ))}
    </div>
  );
});

interface LiveCounterProps {
  className?: string;
}

export function LiveCounter({ className = "" }: LiveCounterProps) {
  const [count, setCount] = useState(12847);
  const [todayVolume, setTodayVolume] = useState(48392.5);

  useEffect(() => {
    // Simulate live updates
    const interval = setInterval(() => {
      setCount((prev) => prev + Math.floor(Math.random() * 3));
      setTodayVolume((prev) => prev + Math.random() * 50);
    }, 5000 + Math.random() * 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex items-center justify-center gap-8 ${className}`}>
      <div className="text-center">
        <div className="text-2xl font-bold text-white tabular-nums">
          {count.toLocaleString()}
        </div>
        <div className="text-white/40 text-sm">Transactions today</div>
      </div>
      <div className="w-px h-10 bg-white/10" />
      <div className="text-center">
        <div className="text-2xl font-bold gradient-text tabular-nums">
          ${todayVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
        <div className="text-white/40 text-sm">Volume today</div>
      </div>
    </div>
  );
}
