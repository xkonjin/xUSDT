/**
 * BalanceDashboard Component Tests
 * 
 * Tests for the balance dashboard component.
 * TDD: Tests written first, before implementation.
 */

import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Import component after mocking
import { BalanceDashboard } from '../BalanceDashboard';

describe('BalanceDashboard', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('Loading State', () => {
    it('should show loading spinner initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<BalanceDashboard address="0xTest" />);

      expect(screen.getByTestId('balance-loading')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show no balances message when no outstanding balances', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          totalOwedToMe: 0,
          totalIOwe: 0,
          netBalance: 0,
          balances: [],
        }),
      });

      render(<BalanceDashboard address="0xTest" />);

      await waitFor(() => {
        expect(screen.getByTestId('balance-empty')).toBeInTheDocument();
      });
    });
  });

  describe('With Balances', () => {
    const mockBalanceData = {
      success: true,
      totalOwedToMe: 150,
      totalIOwe: 50,
      netBalance: 100,
      balances: [
        { name: 'Alice', email: 'alice@test.com', amount: 100, direction: 'owes_me', bills: ['bill1'] },
        { name: 'Bob', amount: 50, direction: 'owes_me', bills: ['bill2'] },
        { name: 'Charlie', address: '0xCharlie', amount: 50, direction: 'i_owe', bills: ['bill3'] },
      ],
    };

    it('should display net balance correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockBalanceData,
      });

      render(<BalanceDashboard address="0xTest" />);

      await waitFor(() => {
        expect(screen.getByTestId('net-balance')).toHaveTextContent('$100.00');
      });
    });

    it('should show positive balance in green', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockBalanceData,
      });

      render(<BalanceDashboard address="0xTest" />);

      await waitFor(() => {
        const netBalance = screen.getByTestId('net-balance');
        expect(netBalance).toHaveClass('text-green-400');
      });
    });

    it('should show negative balance in red', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          ...mockBalanceData,
          netBalance: -50,
          totalOwedToMe: 0,
          totalIOwe: 50,
        }),
      });

      render(<BalanceDashboard address="0xTest" />);

      await waitFor(() => {
        const netBalance = screen.getByTestId('net-balance');
        expect(netBalance).toHaveClass('text-red-400');
      });
    });

    it('should list people who owe user', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockBalanceData,
      });

      render(<BalanceDashboard address="0xTest" />);

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
      });

      // Check amount display
      expect(screen.getByText('owes you $100.00')).toBeInTheDocument();
    });

    it('should list people user owes', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockBalanceData,
      });

      render(<BalanceDashboard address="0xTest" />);

      await waitFor(() => {
        expect(screen.getByText('Charlie')).toBeInTheDocument();
        expect(screen.getByText('you owe $50.00')).toBeInTheDocument();
      });
    });

    it('should show settle button for people who owe user', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockBalanceData,
      });

      render(<BalanceDashboard address="0xTest" />);

      await waitFor(() => {
        // Should have settle buttons for Alice and Bob
        const settleButtons = screen.getAllByTestId('settle-button');
        expect(settleButtons.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error message on fetch failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      render(<BalanceDashboard address="0xTest" />);

      await waitFor(() => {
        expect(screen.getByTestId('balance-error')).toBeInTheDocument();
      });
    });

    it('should show error when API returns error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      });

      render(<BalanceDashboard address="0xTest" />);

      await waitFor(() => {
        expect(screen.getByTestId('balance-error')).toBeInTheDocument();
      });
    });
  });

  describe('Compact Mode', () => {
    it('should render in compact mode when specified', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          totalOwedToMe: 100,
          totalIOwe: 0,
          netBalance: 100,
          balances: [
            { name: 'Alice', amount: 100, direction: 'owes_me', bills: ['bill1'] },
          ],
        }),
      });

      render(<BalanceDashboard address="0xTest" compact />);

      await waitFor(() => {
        expect(screen.getByTestId('balance-compact')).toBeInTheDocument();
      });
    });
  });
});
