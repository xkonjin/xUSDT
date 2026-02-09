/**
 * Contacts Flow E2E Tests
 *
 * Tests the complete contacts flow including:
 * - Add/edit/delete contact
 * - Search contacts
 * - Recent recipients
 * - Favorites management
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import {
  createMockWallet,
  createMockContact,
  TEST_ADDRESSES,
  TEST_EMAILS,
  TEST_PHONES,
} from "./test-utils";

// ============================================================================
// Module Mocks
// ============================================================================

const mockWallet = createMockWallet();

jest.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({
    ready: true,
    authenticated: true,
    user: { email: { address: "test@example.com" } },
    login: jest.fn(),
    logout: jest.fn(),
  }),
  useWallets: () => ({
    wallets: [mockWallet],
  }),
  PrivyProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/contacts",
}));

// ============================================================================
// Test Components
// ============================================================================

interface Contact {
  id: string;
  ownerAddress: string;
  contactAddress: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  isFavorite: boolean;
  lastPayment: string | null;
  createdAt: string;
}

function ContactsTestComponent({
  address = TEST_ADDRESSES.VALID_ADDRESS,
  initialContacts = [],
  onSelectContact = jest.fn(),
}: {
  address?: string;
  initialContacts?: Contact[];
  onSelectContact?: (contact: Contact) => void;
}) {
  const [contacts, setContacts] = React.useState<Contact[]>(initialContacts);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [editingContact, setEditingContact] = React.useState<Contact | null>(
    null
  );

  // Form state
  const [formName, setFormName] = React.useState("");
  const [formEmail, setFormEmail] = React.useState("");
  const [formPhone, setFormPhone] = React.useState("");
  const [formAddress, setFormAddress] = React.useState("");

  const fetchContacts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contacts?address=${address}`);
      if (!res.ok) throw new Error("Failed to load contacts");
      const data = await res.json();
      setContacts(data.contacts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (initialContacts.length === 0) {
      fetchContacts();
    }
  }, [address]);

  const filteredContacts = React.useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.contactAddress?.toLowerCase().includes(q)
    );
  }, [contacts, searchQuery]);

  const recentContacts = React.useMemo(() => {
    return contacts
      .filter((c) => c.lastPayment !== null)
      .sort((a, b) => {
        if (!a.lastPayment || !b.lastPayment) return 0;
        return (
          new Date(b.lastPayment).getTime() - new Date(a.lastPayment).getTime()
        );
      })
      .slice(0, 5);
  }, [contacts]);

  const favoriteContacts = React.useMemo(() => {
    return contacts.filter((c) => c.isFavorite);
  }, [contacts]);

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormAddress("");
    setShowAddForm(false);
    setEditingContact(null);
  };

  const handleAddContact = async () => {
    if (!formName.trim()) {
      setError("Name is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerAddress: address,
          name: formName,
          email: formEmail || null,
          phone: formPhone || null,
          contactAddress: formAddress || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add contact");
      }

      const data = await res.json();
      setContacts([data.contact, ...contacts]);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleEditContact = async () => {
    if (!editingContact) return;
    if (!formName.trim()) {
      setError("Name is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/contacts/${editingContact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          email: formEmail || null,
          phone: formPhone || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update contact");
      }

      const data = await res.json();
      setContacts(
        contacts.map((c) => (c.id === editingContact.id ? data.contact : c))
      );
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm("Delete this contact?")) return;

    const originalContacts = [...contacts];
    setContacts(contacts.filter((c) => c.id !== contactId));

    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setContacts(originalContacts);
        throw new Error("Failed to delete contact");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleToggleFavorite = async (
    contactId: string,
    isFavorite: boolean
  ) => {
    // Optimistic update
    setContacts(
      contacts.map((c) => (c.id === contactId ? { ...c, isFavorite } : c))
    );

    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite }),
      });

      if (!res.ok) {
        // Revert
        setContacts(
          contacts.map((c) =>
            c.id === contactId ? { ...c, isFavorite: !isFavorite } : c
          )
        );
        throw new Error("Failed to update favorite");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const startEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormName(contact.name);
    setFormEmail(contact.email || "");
    setFormPhone(contact.phone || "");
    setFormAddress(contact.contactAddress || "");
    setShowAddForm(true);
  };

  if (loading && contacts.length === 0) {
    return <div data-testid="loading">Loading contacts...</div>;
  }

  return (
    <div>
      <h1>Contacts</h1>

      {/* Search */}
      <div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search contacts..."
          aria-label="Search contacts"
          data-testid="search-input"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} data-testid="clear-search">
            Clear
          </button>
        )}
      </div>

      {error && (
        <div role="alert" data-testid="error-message">
          {error}
        </div>
      )}

      {/* Add/Edit Form */}
      <button
        onClick={() => setShowAddForm(true)}
        data-testid="add-contact-button"
      >
        Add Contact
      </button>

      {showAddForm && (
        <div data-testid="contact-form">
          <h2>{editingContact ? "Edit Contact" : "Add Contact"}</h2>

          <label htmlFor="name">Name *</label>
          <input
            id="name"
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Contact name"
            data-testid="name-input"
          />

          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
            placeholder="email@example.com"
            data-testid="email-input"
          />

          <label htmlFor="phone">Phone</label>
          <input
            id="phone"
            type="tel"
            value={formPhone}
            onChange={(e) => setFormPhone(e.target.value)}
            placeholder="+1234567890"
            data-testid="phone-input"
          />

          {!editingContact && (
            <>
              <label htmlFor="address">Wallet Address</label>
              <input
                id="address"
                type="text"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                placeholder="0x..."
                data-testid="address-input"
              />
            </>
          )}

          <button onClick={resetForm} data-testid="cancel-form">
            Cancel
          </button>
          <button
            onClick={editingContact ? handleEditContact : handleAddContact}
            disabled={loading || !formName.trim()}
            data-testid="save-contact"
          >
            {loading ? "Saving..." : editingContact ? "Update" : "Add"}
          </button>
        </div>
      )}

      {/* Recent Contacts */}
      {recentContacts.length > 0 && !searchQuery && (
        <div data-testid="recent-contacts">
          <h3>Recent</h3>
          {recentContacts.map((contact) => (
            <button
              key={`recent-${contact.id}`}
              onClick={() => onSelectContact(contact)}
              data-testid={`recent-${contact.id}`}
            >
              {contact.name}
            </button>
          ))}
        </div>
      )}

      {/* Favorites */}
      {favoriteContacts.length > 0 && !searchQuery && (
        <div data-testid="favorite-contacts">
          <h3>Favorites</h3>
          {favoriteContacts.map((contact) => (
            <div
              key={`fav-${contact.id}`}
              data-testid={`favorite-${contact.id}`}
            >
              {contact.name}
            </div>
          ))}
        </div>
      )}

      {/* Contact List */}
      {filteredContacts.length === 0 ? (
        searchQuery ? (
          <div data-testid="no-results">
            No contacts found for &quot;{searchQuery}&quot;
          </div>
        ) : (
          <div data-testid="empty-state">
            <p>No contacts yet</p>
            <button
              onClick={() => setShowAddForm(true)}
              data-testid="add-first-contact"
            >
              Add your first contact
            </button>
          </div>
        )
      ) : (
        <div data-testid="contacts-list">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              data-testid={`contact-${contact.id}`}
              onClick={() => onSelectContact(contact)}
            >
              <span data-testid={`contact-name-${contact.id}`}>
                {contact.name}
              </span>
              <span data-testid={`contact-email-${contact.id}`}>
                {contact.email || ""}
              </span>
              <span data-testid={`contact-phone-${contact.id}`}>
                {contact.phone || ""}
              </span>

              {contact.isFavorite && (
                <span data-testid={`favorite-icon-${contact.id}`}>⭐</span>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFavorite(contact.id, !contact.isFavorite);
                }}
                data-testid={`toggle-favorite-${contact.id}`}
              >
                {contact.isFavorite ? "Unfavorite" : "Favorite"}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startEdit(contact);
                }}
                data-testid={`edit-${contact.id}`}
              >
                Edit
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteContact(contact.id);
                }}
                data-testid={`delete-${contact.id}`}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Tests
// ============================================================================

describe("Contacts Flow E2E Tests", () => {
  let originalFetch: typeof global.fetch;
  let confirmSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    originalFetch = global.fetch;
    confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    confirmSpy.mockRestore();
  });

  describe("Add Contact", () => {
    it("should show add contact form when clicking add button", async () => {
      const user = userEvent.setup();
      const contacts = [
        createMockContact({ id: "1", name: "Existing Contact" }),
      ];

      render(<ContactsTestComponent initialContacts={contacts} />);

      await user.click(screen.getByTestId("add-contact-button"));

      expect(screen.getByTestId("contact-form")).toBeInTheDocument();
      expect(screen.getByTestId("name-input")).toBeInTheDocument();
    });

    it("should add contact with all fields", async () => {
      const user = userEvent.setup();
      const existingContact = createMockContact({
        id: "existing",
        name: "Existing",
      });
      const newContact = createMockContact({
        id: "new-contact",
        name: "Alice Smith",
        email: TEST_EMAILS.VALID,
        phone: TEST_PHONES.VALID,
        contactAddress: TEST_ADDRESSES.RECIPIENT_ADDRESS,
      });

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ contact: newContact }),
      });

      // Use initialContacts to avoid fetch on mount
      render(<ContactsTestComponent initialContacts={[existingContact]} />);

      await user.click(screen.getByTestId("add-contact-button"));
      await user.type(screen.getByTestId("name-input"), "Alice Smith");
      await user.type(screen.getByTestId("email-input"), TEST_EMAILS.VALID);
      await user.type(screen.getByTestId("phone-input"), TEST_PHONES.VALID);
      await user.type(
        screen.getByTestId("address-input"),
        TEST_ADDRESSES.RECIPIENT_ADDRESS
      );
      await user.click(screen.getByTestId("save-contact"));

      await waitFor(() => {
        expect(screen.getByTestId("contact-new-contact")).toBeInTheDocument();
        expect(
          screen.getByTestId("contact-name-new-contact")
        ).toHaveTextContent("Alice Smith");
      });
    });

    it("should add contact with name only", async () => {
      const user = userEvent.setup();
      const existingContact = createMockContact({
        id: "existing",
        name: "Existing",
      });
      const newContact = createMockContact({
        id: "name-only",
        name: "Bob",
        email: null,
        phone: null,
        contactAddress: null,
      });

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ contact: newContact }),
      });

      render(<ContactsTestComponent initialContacts={[existingContact]} />);

      await user.click(screen.getByTestId("add-contact-button"));
      await user.type(screen.getByTestId("name-input"), "Bob");
      await user.click(screen.getByTestId("save-contact"));

      await waitFor(() => {
        expect(screen.getByTestId("contact-name-only")).toBeInTheDocument();
      });
    });

    it("should show error when name is empty", async () => {
      const user = userEvent.setup();
      const existingContact = createMockContact({
        id: "existing",
        name: "Existing",
      });

      render(<ContactsTestComponent initialContacts={[existingContact]} />);

      await user.click(screen.getByTestId("add-contact-button"));
      // Don't fill name
      // Button should be disabled when name is empty
      expect(screen.getByTestId("save-contact")).toBeDisabled();
    });

    it("should show error when API fails", async () => {
      const user = userEvent.setup();
      const existingContact = createMockContact({
        id: "existing",
        name: "Existing",
      });

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Duplicate contact" }),
      });

      render(<ContactsTestComponent initialContacts={[existingContact]} />);

      await user.click(screen.getByTestId("add-contact-button"));
      await user.type(screen.getByTestId("name-input"), "Test");
      await user.click(screen.getByTestId("save-contact"));

      await waitFor(() => {
        expect(screen.getByTestId("error-message")).toHaveTextContent(
          "Duplicate contact"
        );
      });
    });

    it("should cancel add form", async () => {
      const user = userEvent.setup();
      const existingContact = createMockContact({
        id: "existing",
        name: "Existing",
      });

      render(<ContactsTestComponent initialContacts={[existingContact]} />);

      await user.click(screen.getByTestId("add-contact-button"));
      expect(screen.getByTestId("contact-form")).toBeInTheDocument();

      await user.click(screen.getByTestId("cancel-form"));
      expect(screen.queryByTestId("contact-form")).not.toBeInTheDocument();
    });
  });

  describe("Edit Contact", () => {
    it("should populate form with existing contact data", async () => {
      const user = userEvent.setup();
      const contact = createMockContact({
        id: "edit-me",
        name: "Original Name",
        email: "original@email.com",
        phone: "+1111111111",
      });

      render(<ContactsTestComponent initialContacts={[contact]} />);

      await user.click(screen.getByTestId("edit-edit-me"));

      expect(screen.getByTestId("name-input")).toHaveValue("Original Name");
      expect(screen.getByTestId("email-input")).toHaveValue(
        "original@email.com"
      );
      expect(screen.getByTestId("phone-input")).toHaveValue("+1111111111");
    });

    it("should update contact name", async () => {
      const user = userEvent.setup();
      const contact = createMockContact({ id: "edit-name", name: "Old Name" });
      const updatedContact = { ...contact, name: "New Name" };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ contact: updatedContact }),
      });

      render(<ContactsTestComponent initialContacts={[contact]} />);

      await user.click(screen.getByTestId("edit-edit-name"));
      await user.clear(screen.getByTestId("name-input"));
      await user.type(screen.getByTestId("name-input"), "New Name");
      await user.click(screen.getByTestId("save-contact"));

      await waitFor(() => {
        expect(screen.getByTestId("contact-name-edit-name")).toHaveTextContent(
          "New Name"
        );
      });
    });

    it("should update contact email and phone", async () => {
      const user = userEvent.setup();
      const contact = createMockContact({
        id: "edit-details",
        name: "Test",
        email: "old@email.com",
        phone: "+1000000000",
      });
      const updatedContact = {
        ...contact,
        email: "new@email.com",
        phone: "+2222222222",
      };

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ contact: updatedContact }),
      });

      render(<ContactsTestComponent initialContacts={[contact]} />);

      await user.click(screen.getByTestId("edit-edit-details"));
      await user.clear(screen.getByTestId("email-input"));
      await user.type(screen.getByTestId("email-input"), "new@email.com");
      await user.clear(screen.getByTestId("phone-input"));
      await user.type(screen.getByTestId("phone-input"), "+2222222222");
      await user.click(screen.getByTestId("save-contact"));

      await waitFor(() => {
        expect(
          screen.getByTestId("contact-email-edit-details")
        ).toHaveTextContent("new@email.com");
        expect(
          screen.getByTestId("contact-phone-edit-details")
        ).toHaveTextContent("+2222222222");
      });
    });

    it("should show error when edit fails", async () => {
      const user = userEvent.setup();
      const contact = createMockContact({ id: "edit-fail", name: "Test" });

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Update failed" }),
      });

      render(<ContactsTestComponent initialContacts={[contact]} />);

      await user.click(screen.getByTestId("edit-edit-fail"));
      await user.click(screen.getByTestId("save-contact"));

      await waitFor(() => {
        expect(screen.getByTestId("error-message")).toHaveTextContent(
          "Update failed"
        );
      });
    });
  });

  describe("Delete Contact", () => {
    it("should delete contact after confirmation", async () => {
      const user = userEvent.setup();
      const contact = createMockContact({ id: "delete-me", name: "To Delete" });

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(<ContactsTestComponent initialContacts={[contact]} />);

      expect(screen.getByTestId("contact-delete-me")).toBeInTheDocument();

      await user.click(screen.getByTestId("delete-delete-me"));

      await waitFor(() => {
        expect(
          screen.queryByTestId("contact-delete-me")
        ).not.toBeInTheDocument();
      });
    });

    it("should not delete if user cancels confirmation", async () => {
      const user = userEvent.setup();
      const contact = createMockContact({ id: "keep-me", name: "Keep This" });

      confirmSpy.mockReturnValueOnce(false);

      render(<ContactsTestComponent initialContacts={[contact]} />);

      await user.click(screen.getByTestId("delete-keep-me"));

      expect(screen.getByTestId("contact-keep-me")).toBeInTheDocument();
    });

    it("should revert on delete failure", async () => {
      const user = userEvent.setup();
      const contact = createMockContact({
        id: "fail-delete",
        name: "Will Fail",
      });

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Delete failed" }),
      });

      render(<ContactsTestComponent initialContacts={[contact]} />);

      await user.click(screen.getByTestId("delete-fail-delete"));

      // Should revert after failed delete
      await waitFor(() => {
        expect(screen.getByTestId("contact-fail-delete")).toBeInTheDocument();
        expect(screen.getByTestId("error-message")).toHaveTextContent(
          /delete/i
        );
      });
    });
  });

  describe("Search Contacts", () => {
    it("should filter contacts by name", async () => {
      const user = userEvent.setup();
      const contacts = [
        createMockContact({ id: "1", name: "Alice" }),
        createMockContact({ id: "2", name: "Bob" }),
        createMockContact({ id: "3", name: "Charlie" }),
      ];

      render(<ContactsTestComponent initialContacts={contacts} />);

      await user.type(screen.getByTestId("search-input"), "Alice");

      expect(screen.getByTestId("contact-1")).toBeInTheDocument();
      expect(screen.queryByTestId("contact-2")).not.toBeInTheDocument();
      expect(screen.queryByTestId("contact-3")).not.toBeInTheDocument();
    });

    it("should filter contacts by email", async () => {
      const user = userEvent.setup();
      const contacts = [
        createMockContact({ id: "1", name: "Alice", email: "alice@gmail.com" }),
        createMockContact({ id: "2", name: "Bob", email: "bob@yahoo.com" }),
      ];

      render(<ContactsTestComponent initialContacts={contacts} />);

      await user.type(screen.getByTestId("search-input"), "gmail");

      expect(screen.getByTestId("contact-1")).toBeInTheDocument();
      expect(screen.queryByTestId("contact-2")).not.toBeInTheDocument();
    });

    it("should filter contacts by phone", async () => {
      const user = userEvent.setup();
      const contacts = [
        createMockContact({ id: "1", name: "Alice", phone: "+12223334444" }),
        createMockContact({ id: "2", name: "Bob", phone: "+15556667777" }),
      ];

      render(<ContactsTestComponent initialContacts={contacts} />);

      await user.type(screen.getByTestId("search-input"), "222");

      expect(screen.getByTestId("contact-1")).toBeInTheDocument();
      expect(screen.queryByTestId("contact-2")).not.toBeInTheDocument();
    });

    it("should filter contacts by wallet address", async () => {
      const user = userEvent.setup();
      const contacts = [
        createMockContact({
          id: "1",
          name: "Alice",
          contactAddress: TEST_ADDRESSES.VALID_ADDRESS,
        }),
        createMockContact({
          id: "2",
          name: "Bob",
          contactAddress: TEST_ADDRESSES.RECIPIENT_ADDRESS,
        }),
      ];

      render(<ContactsTestComponent initialContacts={contacts} />);

      await user.type(screen.getByTestId("search-input"), "742d");

      expect(screen.getByTestId("contact-1")).toBeInTheDocument();
      expect(screen.queryByTestId("contact-2")).not.toBeInTheDocument();
    });

    it("should show no results message", async () => {
      const user = userEvent.setup();
      const contacts = [createMockContact({ id: "1", name: "Alice" })];

      render(<ContactsTestComponent initialContacts={contacts} />);

      await user.type(screen.getByTestId("search-input"), "xyz123");

      expect(screen.getByTestId("no-results")).toBeInTheDocument();
    });

    it("should clear search", async () => {
      const user = userEvent.setup();
      const contacts = [
        createMockContact({ id: "1", name: "Alice" }),
        createMockContact({ id: "2", name: "Bob" }),
      ];

      render(<ContactsTestComponent initialContacts={contacts} />);

      await user.type(screen.getByTestId("search-input"), "Alice");
      expect(screen.queryByTestId("contact-2")).not.toBeInTheDocument();

      await user.click(screen.getByTestId("clear-search"));

      expect(screen.getByTestId("search-input")).toHaveValue("");
      expect(screen.getByTestId("contact-1")).toBeInTheDocument();
      expect(screen.getByTestId("contact-2")).toBeInTheDocument();
    });

    it("should be case-insensitive", async () => {
      const user = userEvent.setup();
      const contacts = [createMockContact({ id: "1", name: "Alice Smith" })];

      render(<ContactsTestComponent initialContacts={contacts} />);

      await user.type(screen.getByTestId("search-input"), "ALICE");

      expect(screen.getByTestId("contact-1")).toBeInTheDocument();
    });
  });

  describe("Recent Recipients", () => {
    it("should show recent contacts section", () => {
      const contacts = [
        createMockContact({
          id: "1",
          name: "Recent Alice",
          lastPayment: "2025-01-25T00:00:00Z",
        }),
        createMockContact({
          id: "2",
          name: "Recent Bob",
          lastPayment: "2025-01-24T00:00:00Z",
        }),
      ];

      render(<ContactsTestComponent initialContacts={contacts} />);

      expect(screen.getByTestId("recent-contacts")).toBeInTheDocument();
      expect(screen.getByTestId("recent-1")).toBeInTheDocument();
      expect(screen.getByTestId("recent-2")).toBeInTheDocument();
    });

    it("should order by most recent payment", () => {
      const contacts = [
        createMockContact({
          id: "older",
          name: "Older",
          lastPayment: "2025-01-20T00:00:00Z",
        }),
        createMockContact({
          id: "newer",
          name: "Newer",
          lastPayment: "2025-01-25T00:00:00Z",
        }),
      ];

      render(<ContactsTestComponent initialContacts={contacts} />);

      const recentSection = screen.getByTestId("recent-contacts");
      const buttons = within(recentSection).getAllByRole("button");

      // First button should be the most recent
      expect(buttons[0]).toHaveTextContent("Newer");
    });

    it("should limit to 5 recent contacts", () => {
      const contacts = Array.from({ length: 10 }, (_, i) =>
        createMockContact({
          id: `contact-${i}`,
          name: `Contact ${i}`,
          lastPayment: new Date(Date.now() - i * 86400000).toISOString(),
        })
      );

      render(<ContactsTestComponent initialContacts={contacts} />);

      const recentSection = screen.getByTestId("recent-contacts");
      const buttons = within(recentSection).getAllByRole("button");

      expect(buttons).toHaveLength(5);
    });

    it("should not show contacts without lastPayment in recent", () => {
      const contacts = [
        createMockContact({
          id: "1",
          name: "Has Payment",
          lastPayment: "2025-01-25T00:00:00Z",
        }),
        createMockContact({ id: "2", name: "No Payment", lastPayment: null }),
      ];

      render(<ContactsTestComponent initialContacts={contacts} />);

      expect(screen.getByTestId("recent-1")).toBeInTheDocument();
      expect(screen.queryByTestId("recent-2")).not.toBeInTheDocument();
    });

    it("should select contact when clicking recent", async () => {
      const user = userEvent.setup();
      const onSelect = jest.fn();
      const contact = createMockContact({
        id: "recent-select",
        name: "Select Me",
        lastPayment: "2025-01-25T00:00:00Z",
      });

      render(
        <ContactsTestComponent
          initialContacts={[contact]}
          onSelectContact={onSelect}
        />
      );

      await user.click(screen.getByTestId("recent-recent-select"));

      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({ id: "recent-select" })
      );
    });

    it("should hide recent section when searching", async () => {
      const user = userEvent.setup();
      const contact = createMockContact({
        id: "1",
        name: "Test",
        lastPayment: "2025-01-25T00:00:00Z",
      });

      render(<ContactsTestComponent initialContacts={[contact]} />);

      expect(screen.getByTestId("recent-contacts")).toBeInTheDocument();

      await user.type(screen.getByTestId("search-input"), "test");

      expect(screen.queryByTestId("recent-contacts")).not.toBeInTheDocument();
    });
  });

  describe("Favorites", () => {
    it("should show favorite icon for favorited contacts", () => {
      const contacts = [
        createMockContact({ id: "1", name: "Favorited", isFavorite: true }),
        createMockContact({
          id: "2",
          name: "Not Favorited",
          isFavorite: false,
        }),
      ];

      render(<ContactsTestComponent initialContacts={contacts} />);

      expect(screen.getByTestId("favorite-icon-1")).toBeInTheDocument();
      expect(screen.queryByTestId("favorite-icon-2")).not.toBeInTheDocument();
    });

    it("should toggle favorite on click", async () => {
      const user = userEvent.setup();
      const contact = createMockContact({
        id: "toggle-fav",
        name: "Toggle Me",
        isFavorite: false,
      });

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ contact: { ...contact, isFavorite: true } }),
      });

      render(<ContactsTestComponent initialContacts={[contact]} />);

      expect(
        screen.queryByTestId("favorite-icon-toggle-fav")
      ).not.toBeInTheDocument();

      await user.click(screen.getByTestId("toggle-favorite-toggle-fav"));

      await waitFor(() => {
        expect(
          screen.getByTestId("favorite-icon-toggle-fav")
        ).toBeInTheDocument();
      });
    });

    it("should remove favorite on click", async () => {
      const user = userEvent.setup();
      const contact = createMockContact({
        id: "unfav",
        name: "Unfavorite Me",
        isFavorite: true,
      });

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ contact: { ...contact, isFavorite: false } }),
      });

      render(<ContactsTestComponent initialContacts={[contact]} />);

      expect(screen.getByTestId("favorite-icon-unfav")).toBeInTheDocument();

      await user.click(screen.getByTestId("toggle-favorite-unfav"));

      await waitFor(() => {
        expect(
          screen.queryByTestId("favorite-icon-unfav")
        ).not.toBeInTheDocument();
      });
    });

    it("should show favorites section", () => {
      const contacts = [
        createMockContact({ id: "1", name: "Fav 1", isFavorite: true }),
        createMockContact({ id: "2", name: "Fav 2", isFavorite: true }),
        createMockContact({ id: "3", name: "Not Fav", isFavorite: false }),
      ];

      render(<ContactsTestComponent initialContacts={contacts} />);

      expect(screen.getByTestId("favorite-contacts")).toBeInTheDocument();
      expect(screen.getByTestId("favorite-1")).toBeInTheDocument();
      expect(screen.getByTestId("favorite-2")).toBeInTheDocument();
      expect(screen.queryByTestId("favorite-3")).not.toBeInTheDocument();
    });

    it("should revert favorite on API error", async () => {
      const user = userEvent.setup();
      const contact = createMockContact({
        id: "fail-fav",
        name: "Fail",
        isFavorite: false,
      });

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Failed" }),
      });

      render(<ContactsTestComponent initialContacts={[contact]} />);

      // Click to favorite
      await user.click(screen.getByTestId("toggle-favorite-fail-fav"));

      // Should revert after API error - final state should be unfavorited
      await waitFor(() => {
        expect(
          screen.queryByTestId("favorite-icon-fail-fav")
        ).not.toBeInTheDocument();
        expect(screen.getByTestId("error-message")).toBeInTheDocument();
      });
    });
  });

  describe("Empty State", () => {
    it("should show empty state when no contacts", () => {
      render(<ContactsTestComponent initialContacts={[]} />);

      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
      expect(screen.getByText(/no contacts yet/i)).toBeInTheDocument();
    });

    it("should show add button in empty state", async () => {
      const user = userEvent.setup();

      render(<ContactsTestComponent initialContacts={[]} />);

      await user.click(screen.getByTestId("add-first-contact"));

      expect(screen.getByTestId("contact-form")).toBeInTheDocument();
    });
  });

  describe("Contact Selection", () => {
    it("should call onSelectContact when clicking contact", async () => {
      const user = userEvent.setup();
      const onSelect = jest.fn();
      const contact = createMockContact({ id: "select-me", name: "Click Me" });

      render(
        <ContactsTestComponent
          initialContacts={[contact]}
          onSelectContact={onSelect}
        />
      );

      await user.click(screen.getByTestId("contact-select-me"));

      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({ id: "select-me", name: "Click Me" })
      );
    });
  });
});
