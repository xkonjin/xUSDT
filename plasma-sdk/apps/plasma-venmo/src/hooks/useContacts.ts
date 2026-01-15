"use client";

import { useState, useEffect, useCallback } from "react";
import type { Contact } from "@/components/ContactList";

interface UseContactsOptions {
  address?: string;
  autoFetch?: boolean;
}

interface UseContactsReturn {
  contacts: Contact[];
  recentContacts: Contact[];
  loading: boolean;
  error: string | null;
  fetchContacts: () => Promise<void>;
  addContact: (data: {
    contactAddress?: string;
    name: string;
    email?: string;
    phone?: string;
  }) => Promise<Contact | null>;
  updateContact: (
    id: string,
    data: { name?: string; email?: string; phone?: string; isFavorite?: boolean }
  ) => Promise<Contact | null>;
  toggleFavorite: (id: string, isFavorite: boolean) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  updateLastPayment: (contactAddress: string) => Promise<void>;
}

export function useContacts({
  address,
  autoFetch = true,
}: UseContactsOptions = {}): UseContactsReturn {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch contacts from API
  const fetchContacts = useCallback(async () => {
    if (!address) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/contacts?address=${address}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch contacts");
      }

      setContacts(data.contacts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [address]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch && address) {
      fetchContacts();
    }
  }, [autoFetch, address, fetchContacts]);

  // Add a new contact
  const addContact = useCallback(
    async (data: {
      contactAddress?: string;
      name: string;
      email?: string;
      phone?: string;
    }): Promise<Contact | null> => {
      if (!address) return null;

      try {
        const response = await fetch("/api/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ownerAddress: address, ...data }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to add contact");
        }

        // Update local state
        setContacts((prev) => [result.contact, ...prev]);
        return result.contact;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        return null;
      }
    },
    [address]
  );

  // Update a contact
  const updateContact = useCallback(
    async (
      id: string,
      data: { name?: string; email?: string; phone?: string; isFavorite?: boolean }
    ): Promise<Contact | null> => {
      try {
        const response = await fetch(`/api/contacts/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to update contact");
        }

        // Update local state
        setContacts((prev) =>
          prev.map((c) => (c.id === id ? result.contact : c))
        );
        return result.contact;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        return null;
      }
    },
    []
  );

  // Toggle favorite status
  const toggleFavorite = useCallback(
    async (id: string, isFavorite: boolean) => {
      // Optimistic update
      setContacts((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isFavorite } : c))
      );

      try {
        const response = await fetch(`/api/contacts/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isFavorite }),
        });

        if (!response.ok) {
          // Revert on error
          setContacts((prev) =>
            prev.map((c) => (c.id === id ? { ...c, isFavorite: !isFavorite } : c))
          );
          const result = await response.json();
          throw new Error(result.error || "Failed to update favorite");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    },
    []
  );

  // Delete a contact
  const deleteContact = useCallback(async (id: string) => {
    // Store contact for potential rollback
    const contactToDelete = contacts.find((c) => c.id === id);
    
    // Optimistic update
    setContacts((prev) => prev.filter((c) => c.id !== id));

    try {
      const response = await fetch(`/api/contacts/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        // Revert on error
        if (contactToDelete) {
          setContacts((prev) => [...prev, contactToDelete]);
        }
        const result = await response.json();
        throw new Error(result.error || "Failed to delete contact");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, [contacts]);

  // Update last payment for a contact (called after successful payment)
  const updateLastPayment = useCallback(
    async (contactAddress: string) => {
      const contact = contacts.find((c) => c.contactAddress === contactAddress);
      if (!contact) return;

      // Optimistic update
      setContacts((prev) =>
        prev.map((c) =>
          c.id === contact.id
            ? { ...c, lastPayment: new Date().toISOString() }
            : c
        )
      );

      try {
        await fetch(`/api/contacts/${contact.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lastPayment: new Date().toISOString() }),
        });
      } catch {
        // Silent fail - not critical
      }
    },
    [contacts]
  );

  // Get recent contacts (sorted by last payment)
  const recentContacts = contacts
    .filter((c) => c.lastPayment !== null)
    .sort((a, b) => {
      if (!a.lastPayment || !b.lastPayment) return 0;
      return (
        new Date(b.lastPayment).getTime() - new Date(a.lastPayment).getTime()
      );
    })
    .slice(0, 5);

  return {
    contacts,
    recentContacts,
    loading,
    error,
    fetchContacts,
    addContact,
    updateContact,
    toggleFavorite,
    deleteContact,
    updateLastPayment,
  };
}

export default useContacts;
