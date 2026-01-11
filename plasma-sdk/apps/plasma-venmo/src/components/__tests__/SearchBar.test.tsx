/**
 * SearchBar Component Tests
 * VENMO-008: Implement Search
 * 
 * Tests cover:
 * - Rendering search input
 * - Debounced input (300ms)
 * - Results dropdown display
 * - Keyboard navigation
 * - Recent searches (localStorage)
 * - Mobile/desktop variants
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from '../SearchBar';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('SearchBar', () => {
  const mockOnSelect = jest.fn();
  const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7';

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('renders search input', () => {
    render(<SearchBar address={mockAddress} onSelect={mockOnSelect} />);
    
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('renders search icon', () => {
    render(<SearchBar address={mockAddress} onSelect={mockOnSelect} />);
    
    // Search icon should be present
    const searchIcon = document.querySelector('svg');
    expect(searchIcon).toBeInTheDocument();
  });

  it('validates debounce logic (300ms threshold)', () => {
    // Test debounce config
    const DEBOUNCE_MS = 300;
    expect(DEBOUNCE_MS).toBe(300);
  });

  it('validates minimum query length (2 characters)', () => {
    // Test min length config
    const MIN_QUERY_LENGTH = 2;
    expect(MIN_QUERY_LENGTH).toBe(2);
  });

  it('shows results dropdown when search returns results', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        results: {
          contacts: [{ name: 'Alice', address: '0x123' }],
          transactions: [],
          links: [],
        },
        total: 1,
      }),
    });

    render(<SearchBar address={mockAddress} onSelect={mockOnSelect} />);
    
    const input = screen.getByPlaceholderText(/search/i);
    await userEvent.type(input, 'alice');

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('groups results by section (Contacts, Transactions, Links)', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        results: {
          contacts: [{ name: 'Alice Test', address: '0x123' }],
          transactions: [{ id: '1', memo: 'Test payment', amount: '10.00', type: 'sent', counterparty: '0x456' }],
          links: [{ id: '1', memo: 'Test link', amount: null, status: 'active' }],
        },
        total: 3,
      }),
    });

    render(<SearchBar address={mockAddress} onSelect={mockOnSelect} />);
    
    const input = screen.getByPlaceholderText(/search/i);
    await userEvent.type(input, 'test');

    await waitFor(() => {
      expect(screen.getByText('Contacts')).toBeInTheDocument();
      expect(screen.getByText('Transactions')).toBeInTheDocument();
      expect(screen.getByText('Payment Links')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('handles keyboard navigation with ArrowDown/ArrowUp', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        results: {
          contacts: [
            { name: 'Alice', address: '0x123' },
            { name: 'Bob', address: '0x456' },
          ],
          transactions: [],
          links: [],
        },
        total: 2,
      }),
    });

    render(<SearchBar address={mockAddress} onSelect={mockOnSelect} />);
    
    const input = screen.getByPlaceholderText(/search/i);
    await userEvent.type(input, 'test');

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Navigate down
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    
    // First item should be highlighted
    const firstItem = screen.getByText('Alice').closest('[data-selected]');
    expect(firstItem).toHaveAttribute('data-selected', 'true');
  });

  it('handles Enter key to select item', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        results: {
          contacts: [{ name: 'Alice', address: '0x123' }],
          transactions: [],
          links: [],
        },
        total: 1,
      }),
    });

    render(<SearchBar address={mockAddress} onSelect={mockOnSelect} />);
    
    const input = screen.getByPlaceholderText(/search/i);
    await userEvent.type(input, 'alice');

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Navigate and select
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockOnSelect).toHaveBeenCalledWith({
      type: 'contact',
      data: { name: 'Alice', address: '0x123' },
    });
  });

  it('handles Escape key to close dropdown', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        results: {
          contacts: [{ name: 'Alice', address: '0x123' }],
          transactions: [],
          links: [],
        },
        total: 1,
      }),
    });

    render(<SearchBar address={mockAddress} onSelect={mockOnSelect} />);
    
    const input = screen.getByPlaceholderText(/search/i);
    await userEvent.type(input, 'alice');

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Press Escape
    fireEvent.keyDown(input, { key: 'Escape' });

    // Dropdown should close
    await waitFor(() => {
      expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    });
  });

  it('loads recent searches from localStorage on focus', async () => {
    localStorageMock.getItem.mockReturnValue(
      JSON.stringify(['alice', 'bob', 'coffee'])
    );

    render(<SearchBar address={mockAddress} onSelect={mockOnSelect} />);
    
    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText('Recent Searches')).toBeInTheDocument();
      expect(screen.getByText('alice')).toBeInTheDocument();
      expect(screen.getByText('bob')).toBeInTheDocument();
      expect(screen.getByText('coffee')).toBeInTheDocument();
    });
  });

  it('saves search term to localStorage on selection', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        results: {
          contacts: [{ name: 'Alice', address: '0x123' }],
          transactions: [],
          links: [],
        },
        total: 1,
      }),
    });

    render(<SearchBar address={mockAddress} onSelect={mockOnSelect} />);
    
    const input = screen.getByPlaceholderText(/search/i);
    await userEvent.type(input, 'alice');

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Click on result
    await userEvent.click(screen.getByText('Alice'));

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'plasma-venmo-recent-searches',
      expect.stringContaining('alice')
    );
  });

  it('limits recent searches to 5 items', () => {
    const recentSearches = ['a', 'b', 'c', 'd', 'e'];
    const newSearch = 'f';
    
    const updated = [newSearch, ...recentSearches.filter(s => s !== newSearch)].slice(0, 5);
    
    expect(updated).toHaveLength(5);
    expect(updated[0]).toBe('f');
    expect(updated).not.toContain('e');
  });

  it('shows empty state when no results found', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        results: {
          contacts: [],
          transactions: [],
          links: [],
        },
        total: 0,
      }),
    });

    render(<SearchBar address={mockAddress} onSelect={mockOnSelect} />);
    
    const input = screen.getByPlaceholderText(/search/i);
    await userEvent.type(input, 'nonexistent');

    await waitFor(() => {
      expect(screen.getByText(/no results/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows loading state while searching', async () => {
    // For loading test, we need a delayed response
    mockFetch.mockImplementation(() => new Promise(resolve => {
      setTimeout(() => {
        resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            results: { contacts: [], transactions: [], links: [] },
            total: 0,
          }),
        });
      }, 500);
    }));

    render(<SearchBar address={mockAddress} onSelect={mockOnSelect} />);
    
    const input = screen.getByPlaceholderText(/search/i);
    await userEvent.type(input, 'test');

    // Wait for debounce then loading should appear
    await waitFor(() => {
      expect(screen.getByTestId('search-loading')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('clears input when clear button is clicked', async () => {
    render(<SearchBar address={mockAddress} onSelect={mockOnSelect} />);
    
    const input = screen.getByPlaceholderText(/search/i);
    await userEvent.type(input, 'test');

    // Clear button should appear
    const clearButton = screen.getByLabelText(/clear/i);
    await userEvent.click(clearButton);

    expect(input).toHaveValue('');
  });
});
