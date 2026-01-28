"use client";

import { memo } from "react";
import { User } from "lucide-react";
import type { Contact } from "../ContactList";

interface RecentContactsProps {
  contacts: Contact[];
  onSelect: (contact: Contact) => void;
  loading?: boolean;
}

export function ContactSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2 animate-pulse">
      <div className="w-12 h-12 rounded-full bg-white/10" />
      <div className="w-16 h-3 rounded bg-white/10" />
    </div>
  );
}

export const RecentContacts = memo(function RecentContacts({ 
  contacts, 
  onSelect,
  loading = false 
}: RecentContactsProps) {
  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {Array.from({ length: 5 }).map((_, i) => (
          <ContactSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="text-center text-gray-400 py-4">
        <p className="text-sm">No recent contacts</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
      {contacts.slice(0, 10).map((contact) => (
        <button
          key={contact.id}
          onClick={() => onSelect(contact)}
          className="flex flex-col items-center gap-2 min-w-[64px] group"
          aria-label={`Send to ${contact.name || contact.contactAddress}`}
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-plenmo-500 to-plenmo-600 flex items-center justify-center text-white font-semibold group-hover:scale-110 transition-transform">
            <span className="text-sm">
              {(contact.name || contact.contactAddress || "?")
                .slice(0, 2)
                .toUpperCase()}
            </span>
          </div>
          <span className="text-xs text-gray-300 truncate max-w-[64px]">
            {contact.name || (contact.contactAddress ? `${contact.contactAddress.slice(0, 6)}...` : "Unknown")}
          </span>
        </button>
      ))}
    </div>
  );
});
