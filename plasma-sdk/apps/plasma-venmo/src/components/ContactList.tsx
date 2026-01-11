"use client";

import { useState, useMemo } from "react";
import { Search, Star, Send, Trash2, X, User, Clock } from "lucide-react";

export interface Contact {
  id: string;
  ownerAddress: string;
  contactAddress: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  isFavorite: boolean;
  lastPayment: Date | string | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

interface ContactListProps {
  contacts: Contact[];
  loading?: boolean;
  onSelectContact: (contact: Contact) => void;
  onToggleFavorite: (contactId: string, isFavorite: boolean) => void;
  onDelete?: (contactId: string) => void;
  showQuickSend?: boolean;
  sortBy?: "favorites" | "recent" | "name";
  showRecent?: boolean;
  recentLimit?: number;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatLastPayment(lastPayment: Date | string | null): string {
  if (!lastPayment) return "";
  const date = new Date(lastPayment);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return date.toLocaleDateString();
}

export function ContactList({
  contacts,
  loading = false,
  onSelectContact,
  onToggleFavorite,
  onDelete,
  showQuickSend = false,
  sortBy = "favorites",
  showRecent = false,
  recentLimit = 5,
}: ContactListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter contacts by search query
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    
    const q = searchQuery.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q)
    );
  }, [contacts, searchQuery]);

  // Sort contacts based on sortBy prop
  const sortedContacts = useMemo(() => {
    const sorted = [...filteredContacts];
    
    switch (sortBy) {
      case "favorites":
        return sorted.sort((a, b) => {
          if (a.isFavorite && !b.isFavorite) return -1;
          if (!a.isFavorite && b.isFavorite) return 1;
          return a.name.localeCompare(b.name);
        });
      case "recent":
        return sorted.sort((a, b) => {
          if (!a.lastPayment && !b.lastPayment) return a.name.localeCompare(b.name);
          if (!a.lastPayment) return 1;
          if (!b.lastPayment) return -1;
          return new Date(b.lastPayment).getTime() - new Date(a.lastPayment).getTime();
        });
      case "name":
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return sorted;
    }
  }, [filteredContacts, sortBy]);

  // Get recent contacts (those with lastPayment)
  const recentContacts = useMemo(() => {
    if (!showRecent) return [];
    
    return contacts
      .filter((c) => c.lastPayment !== null)
      .sort((a, b) => {
        if (!a.lastPayment || !b.lastPayment) return 0;
        return new Date(b.lastPayment).getTime() - new Date(a.lastPayment).getTime();
      })
      .slice(0, recentLimit);
  }, [contacts, showRecent, recentLimit]);

  // Loading state
  if (loading) {
    return (
      <div data-testid="contact-list-loading" className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse bg-white/5 rounded-2xl h-16"
          />
        ))}
      </div>
    );
  }

  // Empty state
  if (contacts.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="w-12 h-12 mx-auto mb-4 text-white/30" />
        <p className="text-white/50 text-lg">No contacts yet</p>
        <p className="text-white/30 text-sm mt-1">
          Add your first contact to get started
        </p>
      </div>
    );
  }

  const handleKeyDown = (
    e: React.KeyboardEvent,
    contact: Contact
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelectContact(contact);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search contacts..."
          aria-label="Search contacts"
          className="w-full pl-12 pr-10 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-white/30 focus:outline-none focus:border-[rgb(0,212,255)]/50 transition-colors"
        />
        {searchQuery && (
          <button
            data-testid="clear-search"
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Recent contacts section */}
      {showRecent && recentContacts.length > 0 && !searchQuery && (
        <div data-testid="recent-contacts-section" className="mb-6">
          <h3 className="text-sm font-medium text-white/50 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Recent
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recentContacts.map((contact) => (
              <button
                key={`recent-${contact.id}`}
                data-testid="contact-item"
                onClick={() => onSelectContact(contact)}
                className="flex flex-col items-center gap-2 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors min-w-[80px]"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[rgb(0,212,255)]/30 to-purple-500/30 flex items-center justify-center text-white font-medium">
                  {getInitials(contact.name)}
                </div>
                <span className="text-white text-xs truncate max-w-[70px]">
                  {contact.name.split(" ")[0]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No results from search */}
      {filteredContacts.length === 0 && searchQuery && (
        <div className="text-center py-8">
          <p className="text-white/50">No contacts found for &quot;{searchQuery}&quot;</p>
        </div>
      )}

      {/* Contact list */}
      <div className="space-y-2">
        {sortedContacts.map((contact) => (
          <div
            key={contact.id}
            data-testid="contact-item"
            tabIndex={0}
            role="button"
            onClick={() => onSelectContact(contact)}
            onKeyDown={(e) => handleKeyDown(e, contact)}
            className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors cursor-pointer group"
          >
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[rgb(0,212,255)]/30 to-purple-500/30 flex items-center justify-center text-white font-medium flex-shrink-0">
              {getInitials(contact.name)}
            </div>

            {/* Contact info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white font-medium truncate">{contact.name}</p>
                {contact.isFavorite && (
                  <Star
                    data-testid="favorite-icon-filled"
                    className="w-4 h-4 text-yellow-400 fill-yellow-400"
                  />
                )}
              </div>
              <p className="text-white/50 text-sm truncate">
                {contact.email || contact.phone || (contact.contactAddress ? `${contact.contactAddress.slice(0, 6)}...${contact.contactAddress.slice(-4)}` : "")}
              </p>
              {contact.lastPayment && (
                <p className="text-white/30 text-xs">
                  Last: {formatLastPayment(contact.lastPayment)}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Favorite button */}
              <button
                data-testid="favorite-button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(contact.id, !contact.isFavorite);
                }}
                className={`p-2 rounded-xl transition-colors ${
                  contact.isFavorite
                    ? "text-yellow-400 hover:bg-yellow-400/10"
                    : "text-white/30 hover:text-yellow-400 hover:bg-white/5"
                }`}
              >
                <Star
                  className={`w-5 h-5 ${contact.isFavorite ? "fill-yellow-400" : ""}`}
                />
              </button>

              {/* Quick send button */}
              {showQuickSend && contact.contactAddress && (
                <button
                  data-testid="quick-send-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectContact(contact);
                  }}
                  className="p-2 rounded-xl text-[rgb(0,212,255)] hover:bg-[rgb(0,212,255)]/10 transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              )}

              {/* Delete button */}
              {onDelete && (
                <button
                  data-testid="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(contact.id);
                  }}
                  className="p-2 rounded-xl text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ContactList;
