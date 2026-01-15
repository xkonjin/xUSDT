/**
 * ContactList Component Tests
 * VENMO-007: Add Friend/Contact System
 * 
 * Tests cover:
 * - Rendering contact list
 * - Search/filter functionality
 * - Favorite toggle
 * - Quick actions (send, favorite)
 * - Empty states
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContactList } from '../ContactList';

// Mock contacts data
const mockContacts = [
  {
    id: 'contact-1',
    ownerAddress: '0x1234567890123456789012345678901234567890',
    contactAddress: '0xaaaa567890123456789012345678901234567890',
    name: 'Alice Smith',
    email: 'alice@example.com',
    phone: '+12345678900',
    isFavorite: true,
    lastPayment: new Date('2025-01-10T12:00:00Z'),
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-10T12:00:00Z'),
  },
  {
    id: 'contact-2',
    ownerAddress: '0x1234567890123456789012345678901234567890',
    contactAddress: '0xbbbb567890123456789012345678901234567890',
    name: 'Bob Jones',
    email: 'bob@test.com',
    phone: null,
    isFavorite: false,
    lastPayment: null,
    createdAt: new Date('2025-01-05T00:00:00Z'),
    updatedAt: new Date('2025-01-05T00:00:00Z'),
  },
  {
    id: 'contact-3',
    ownerAddress: '0x1234567890123456789012345678901234567890',
    contactAddress: null,
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    phone: '+19876543210',
    isFavorite: false,
    lastPayment: new Date('2025-01-08T12:00:00Z'),
    createdAt: new Date('2025-01-03T00:00:00Z'),
    updatedAt: new Date('2025-01-08T12:00:00Z'),
  },
];

// Mock callbacks
const mockOnSelectContact = jest.fn();
const mockOnToggleFavorite = jest.fn();
const mockOnDelete = jest.fn();

describe('ContactList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders contact list with all contacts', () => {
      render(
        <ContactList
          contacts={mockContacts}
          onSelectContact={mockOnSelectContact}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Jones')).toBeInTheDocument();
      expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
    });

    it('renders empty state when no contacts', () => {
      render(
        <ContactList
          contacts={[]}
          onSelectContact={mockOnSelectContact}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      expect(screen.getByText(/no contacts/i)).toBeInTheDocument();
    });

    it('shows loading state', () => {
      render(
        <ContactList
          contacts={[]}
          loading={true}
          onSelectContact={mockOnSelectContact}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      expect(screen.getByTestId('contact-list-loading')).toBeInTheDocument();
    });

    it('displays contact email or phone', () => {
      render(
        <ContactList
          contacts={mockContacts}
          onSelectContact={mockOnSelectContact}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      expect(screen.getByText('alice@example.com')).toBeInTheDocument();
      expect(screen.getByText('bob@test.com')).toBeInTheDocument();
    });

    it('shows favorite indicator for favorited contacts', () => {
      render(
        <ContactList
          contacts={mockContacts}
          onSelectContact={mockOnSelectContact}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      const favoriteIcons = screen.getAllByTestId('favorite-icon-filled');
      expect(favoriteIcons).toHaveLength(1); // Only Alice is favorited
    });

    it('displays avatar placeholder with initials', () => {
      render(
        <ContactList
          contacts={mockContacts}
          onSelectContact={mockOnSelectContact}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      // Check for avatar elements containing initials
      expect(screen.getByText('AS')).toBeInTheDocument(); // Alice Smith
      expect(screen.getByText('BJ')).toBeInTheDocument(); // Bob Jones
      expect(screen.getByText('CB')).toBeInTheDocument(); // Charlie Brown
    });
  });

  describe('Search/Filter', () => {
    it('renders search input', () => {
      render(
        <ContactList
          contacts={mockContacts}
          onSelectContact={mockOnSelectContact}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      expect(screen.getByPlaceholderText(/search contacts/i)).toBeInTheDocument();
    });

    it('filters contacts by name', async () => {
      const user = userEvent.setup();
      
      render(
        <ContactList
          contacts={mockContacts}
          onSelectContact={mockOnSelectContact}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search contacts/i);
      await user.type(searchInput, 'alice');

      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument();
      expect(screen.queryByText('Charlie Brown')).not.toBeInTheDocument();
    });

    it('filters contacts by email', async () => {
      const user = userEvent.setup();
      
      render(
        <ContactList
          contacts={mockContacts}
          onSelectContact={mockOnSelectContact}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search contacts/i);
      await user.type(searchInput, '@test.com');

      expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
      expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    });

    it('shows no results message when filter matches nothing', async () => {
      const user = userEvent.setup();
      
      render(
        <ContactList
          contacts={mockContacts}
          onSelectContact={mockOnSelectContact}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search contacts/i);
      await user.type(searchInput, 'xyz123');

      expect(screen.getByText(/no contacts found/i)).toBeInTheDocument();
    });

    it('clears search when clear button clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <ContactList
          contacts={mockContacts}
          onSelectContact={mockOnSelectContact}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search contacts/i);
      await user.type(searchInput, 'alice');

      const clearButton = screen.getByTestId('clear-search');
      await user.click(clearButton);

      expect(searchInput).toHaveValue('');
      expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onSelectContact when clicking a contact', async () => {
      const user = userEvent.setup();
      
      render(
        <ContactList
          contacts={mockContacts}
          onSelectContact={mockOnSelectContact}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      const aliceContact = screen.getByText('Alice Smith').closest('[data-testid="contact-item"]');
      if (aliceContact) {
        await user.click(aliceContact);
      }

      expect(mockOnSelectContact).toHaveBeenCalledWith(mockContacts[0]);
    });

    it('calls onToggleFavorite when clicking favorite button', async () => {
      const user = userEvent.setup();
      
      render(
        <ContactList
          contacts={mockContacts}
          onSelectContact={mockOnSelectContact}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      const favoriteButtons = screen.getAllByTestId('favorite-button');
      await user.click(favoriteButtons[1]); // Click Bob's favorite button

      expect(mockOnToggleFavorite).toHaveBeenCalledWith('contact-2', true);
    });

    it('unfavorites when clicking favorite on already favorited contact', async () => {
      const user = userEvent.setup();
      
      render(
        <ContactList
          contacts={mockContacts}
          onSelectContact={mockOnSelectContact}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      const favoriteButtons = screen.getAllByTestId('favorite-button');
      await user.click(favoriteButtons[0]); // Click Alice's favorite button (already favorite)

      expect(mockOnToggleFavorite).toHaveBeenCalledWith('contact-1', false);
    });

    it('shows quick send button for contacts with address', () => {
      render(
        <ContactList
          contacts={mockContacts}
          onSelectContact={mockOnSelectContact}
          onToggleFavorite={mockOnToggleFavorite}
          showQuickSend={true}
        />
      );

      const sendButtons = screen.getAllByTestId('quick-send-button');
      // Alice and Bob have addresses, Charlie doesn't
      expect(sendButtons).toHaveLength(2);
    });

    it('calls onDelete when delete button clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <ContactList
          contacts={mockContacts}
          onSelectContact={mockOnSelectContact}
          onToggleFavorite={mockOnToggleFavorite}
          onDelete={mockOnDelete}
        />
      );

      const deleteButtons = screen.getAllByTestId('delete-button');
      await user.click(deleteButtons[0]);

      expect(mockOnDelete).toHaveBeenCalledWith('contact-1');
    });
  });

  describe('Sorting', () => {
    it('sorts favorites first by default', () => {
      render(
        <ContactList
          contacts={mockContacts}
          onSelectContact={mockOnSelectContact}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      const contactItems = screen.getAllByTestId('contact-item');
      // Alice is favorited, should be first
      expect(contactItems[0]).toHaveTextContent('Alice Smith');
    });

    it('supports sorting by recent', () => {
      render(
        <ContactList
          contacts={mockContacts}
          onSelectContact={mockOnSelectContact}
          onToggleFavorite={mockOnToggleFavorite}
          sortBy="recent"
        />
      );

      const contactItems = screen.getAllByTestId('contact-item');
      // Alice has most recent payment (2025-01-10)
      expect(contactItems[0]).toHaveTextContent('Alice Smith');
    });

    it('supports sorting alphabetically', () => {
      render(
        <ContactList
          contacts={mockContacts}
          onSelectContact={mockOnSelectContact}
          onToggleFavorite={mockOnToggleFavorite}
          sortBy="name"
        />
      );

      const contactItems = screen.getAllByTestId('contact-item');
      expect(contactItems[0]).toHaveTextContent('Alice Smith');
      expect(contactItems[1]).toHaveTextContent('Bob Jones');
      expect(contactItems[2]).toHaveTextContent('Charlie Brown');
    });
  });

  describe('Recent Contacts Section', () => {
    it('shows recent contacts when enabled', () => {
      render(
        <ContactList
          contacts={mockContacts}
          onSelectContact={mockOnSelectContact}
          onToggleFavorite={mockOnToggleFavorite}
          showRecent={true}
          recentLimit={2}
        />
      );

      expect(screen.getByText(/recent/i)).toBeInTheDocument();
    });

    it('limits recent contacts to specified amount', () => {
      render(
        <ContactList
          contacts={mockContacts}
          onSelectContact={mockOnSelectContact}
          onToggleFavorite={mockOnToggleFavorite}
          showRecent={true}
          recentLimit={1}
        />
      );

      const recentSection = screen.getByTestId('recent-contacts-section');
      const recentItems = recentSection.querySelectorAll('[data-testid="contact-item"]');
      expect(recentItems).toHaveLength(1);
    });
  });

  describe('Accessibility', () => {
    it('has accessible search input', () => {
      render(
        <ContactList
          contacts={mockContacts}
          onSelectContact={mockOnSelectContact}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search contacts/i);
      expect(searchInput).toHaveAttribute('aria-label');
    });

    it('contact items are focusable', () => {
      render(
        <ContactList
          contacts={mockContacts}
          onSelectContact={mockOnSelectContact}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      const contactItems = screen.getAllByTestId('contact-item');
      contactItems.forEach(item => {
        expect(item).toHaveAttribute('tabIndex', '0');
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <ContactList
          contacts={mockContacts}
          onSelectContact={mockOnSelectContact}
          onToggleFavorite={mockOnToggleFavorite}
        />
      );

      const contactItems = screen.getAllByTestId('contact-item');
      contactItems[0].focus();
      
      await user.keyboard('{Enter}');
      expect(mockOnSelectContact).toHaveBeenCalled();
    });
  });
});
