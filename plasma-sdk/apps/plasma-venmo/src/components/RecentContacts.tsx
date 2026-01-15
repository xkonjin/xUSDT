"use client";

import { User, Star } from "lucide-react";
import type { Contact } from "./ContactList";

interface RecentContactsProps {
  contacts: Contact[];
  onSelect: (contact: Contact) => void;
  loading?: boolean;
  limit?: number;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function RecentContacts({
  contacts,
  onSelect,
  loading = false,
  limit = 5,
}: RecentContactsProps) {
  // Filter to show recent + favorites, limited to `limit`
  const displayContacts = contacts
    .filter((c) => c.lastPayment || c.isFavorite)
    .sort((a, b) => {
      // Favorites first
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      // Then by last payment
      if (!a.lastPayment && !b.lastPayment) return 0;
      if (!a.lastPayment) return 1;
      if (!b.lastPayment) return -1;
      return new Date(b.lastPayment).getTime() - new Date(a.lastPayment).getTime();
    })
    .slice(0, limit);

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto py-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="w-16 h-20 bg-white/5 rounded-xl animate-pulse flex-shrink-0"
          />
        ))}
      </div>
    );
  }

  if (displayContacts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-white/50 text-xs font-medium">Recent</p>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
        {displayContacts.map((contact) => (
          <button
            key={contact.id}
            onClick={() => onSelect(contact)}
            className="flex flex-col items-center gap-2 p-2 min-w-[64px] bg-white/5 hover:bg-white/10 rounded-xl transition-colors flex-shrink-0 group"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[rgb(0,212,255)]/30 to-purple-500/30 flex items-center justify-center text-white text-sm font-medium group-hover:scale-105 transition-transform">
                {getInitials(contact.name)}
              </div>
              {contact.isFavorite && (
                <Star className="absolute -top-1 -right-1 w-3 h-3 text-yellow-400 fill-yellow-400" />
              )}
            </div>
            <span className="text-white/80 text-xs truncate w-full text-center">
              {contact.name.split(" ")[0]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default RecentContacts;
