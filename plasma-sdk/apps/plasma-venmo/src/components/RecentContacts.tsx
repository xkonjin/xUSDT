"use client";

import { memo, useMemo, useCallback } from "react";
import { Star } from "lucide-react";
import type { Contact } from "./ContactList";

interface RecentContactsProps {
  contacts: Contact[];
  onSelect: (contact: Contact) => void;
  loading?: boolean;
  limit?: number;
}

function getInitials(name: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Generate consistent color based on name
function getAvatarColor(name: string): string {
  const colors = [
    "from-plenmo-500/40 to-purple-500/40",
    "from-teal-500/40 to-emerald-500/40",
    "from-green-500/40 to-emerald-500/40",
    "from-orange-500/40 to-amber-500/40",
    "from-pink-500/40 to-rose-500/40",
    "from-violet-500/40 to-indigo-500/40",
  ];
  const index =
    name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    colors.length;
  return colors[index];
}

// Memoized contact button component
const ContactButton = memo(function ContactButton({
  contact,
  onSelect,
}: {
  contact: Contact;
  onSelect: (contact: Contact) => void;
}) {
  const handleClick = useCallback(() => {
    onSelect(contact);
  }, [contact, onSelect]);

  const avatarColor = useMemo(
    () => getAvatarColor(contact.name),
    [contact.name]
  );
  const initials = useMemo(() => getInitials(contact.name), [contact.name]);
  const firstName = useMemo(() => contact.name.split(" ")[0], [contact.name]);

  return (
    <button
      onClick={handleClick}
      className="flex flex-col items-center gap-2 p-2 min-w-[64px] bg-white/5 hover:bg-white/10 rounded-xl transition-all flex-shrink-0 group focus:outline-none focus:ring-2 focus:ring-plenmo-500/50"
      aria-label={`Send to ${contact.name}`}
    >
      <div className="relative">
        <div
          className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white text-sm font-medium group-hover:scale-105 transition-transform`}
        >
          {initials}
        </div>
        {contact.isFavorite && (
          <Star
            className="absolute -top-1 -right-1 w-3 h-3 text-yellow-400 fill-yellow-400"
            aria-label="Favorite"
          />
        )}
      </div>
      <span className="text-white/80 text-xs truncate w-full text-center group-hover:text-white transition-colors">
        {firstName}
      </span>
    </button>
  );
});

// Loading skeleton component
const LoadingSkeleton = memo(function LoadingSkeleton({
  count,
}: {
  count: number;
}) {
  return (
    <div className="flex gap-3 overflow-x-auto py-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-16 h-20 bg-white/5 rounded-xl animate-pulse flex-shrink-0"
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  );
});

export const RecentContacts = memo(function RecentContacts({
  contacts,
  onSelect,
  loading = false,
  limit = 5,
}: RecentContactsProps) {
  // Memoize the filtered and sorted contacts
  const displayContacts = useMemo(() => {
    return contacts
      .filter((c) => c.lastPayment || c.isFavorite)
      .sort((a, b) => {
        // Favorites first
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        // Then by last payment
        if (!a.lastPayment && !b.lastPayment) return 0;
        if (!a.lastPayment) return 1;
        if (!b.lastPayment) return -1;
        return (
          new Date(b.lastPayment).getTime() - new Date(a.lastPayment).getTime()
        );
      })
      .slice(0, limit);
  }, [contacts, limit]);

  if (loading) {
    return <LoadingSkeleton count={limit} />;
  }

  if (displayContacts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-white/50 text-xs font-medium">Recent</p>
      <div
        className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide"
        role="list"
        aria-label="Recent contacts"
      >
        {displayContacts.map((contact) => (
          <ContactButton
            key={contact.id}
            contact={contact}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
});

export default RecentContacts;
