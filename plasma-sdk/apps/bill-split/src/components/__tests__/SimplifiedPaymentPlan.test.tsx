/**
 * SimplifiedPaymentPlan Component Tests
 * 
 * Tests for the simplified payment plan display component.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SimplifiedPaymentPlan } from '../SimplifiedPaymentPlan';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock clipboard
const mockWriteText = jest.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

describe('SimplifiedPaymentPlan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWriteText.mockResolvedValue(undefined);
  });

  it('should show loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<SimplifiedPaymentPlan address="0xTest" />);

    expect(screen.getByTestId('simplified-loading')).toBeInTheDocument();
  });

  it('should show error state on fetch failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<SimplifiedPaymentPlan address="0xTest" />);

    await waitFor(() => {
      expect(screen.getByTestId('simplified-error')).toBeInTheDocument();
    });
  });

  it('should show empty state when no payments needed', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        simplifiedPayments: [],
        originalCount: 0,
        simplifiedCount: 0,
        savingsCount: 0,
        savingsMessage: 'No debts to simplify',
      }),
    });

    render(<SimplifiedPaymentPlan address="0xTest" />);

    await waitFor(() => {
      expect(screen.getByTestId('simplified-empty')).toBeInTheDocument();
    });
    expect(screen.getByText(/all settled up/i)).toBeInTheDocument();
  });

  it('should display simplified payments', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        simplifiedPayments: [
          { from: 'Alice', to: 'You', amount: 50 },
          { from: 'Bob', to: 'You', amount: 30 },
        ],
        originalCount: 5,
        simplifiedCount: 2,
        savingsCount: 3,
        savingsMessage: '2 payments instead of 5',
      }),
    });

    render(<SimplifiedPaymentPlan address="0xTest" />);

    await waitFor(() => {
      expect(screen.getAllByTestId('payment-card')).toHaveLength(2);
    });

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('$50.00')).toBeInTheDocument();
    expect(screen.getByText('$30.00')).toBeInTheDocument();
  });

  it('should show savings badge when there are savings', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        simplifiedPayments: [
          { from: 'Alice', to: 'You', amount: 100 },
        ],
        originalCount: 3,
        simplifiedCount: 1,
        savingsCount: 2,
        savingsMessage: '1 payment instead of 3',
      }),
    });

    render(<SimplifiedPaymentPlan address="0xTest" />);

    await waitFor(() => {
      expect(screen.getByTestId('savings-badge')).toBeInTheDocument();
    });
    expect(screen.getByText(/save 2 transactions/i)).toBeInTheDocument();
  });

  it('should not show savings badge when no savings', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        simplifiedPayments: [
          { from: 'Alice', to: 'You', amount: 50 },
        ],
        originalCount: 1,
        simplifiedCount: 1,
        savingsCount: 0,
        savingsMessage: 'No simplification possible',
      }),
    });

    render(<SimplifiedPaymentPlan address="0xTest" />);

    await waitFor(() => {
      expect(screen.getAllByTestId('payment-card')).toHaveLength(1);
    });

    expect(screen.queryByTestId('savings-badge')).not.toBeInTheDocument();
  });

  it('should copy payment link on button click', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        simplifiedPayments: [
          { from: 'Alice', to: 'You', amount: 50 },
        ],
        originalCount: 1,
        simplifiedCount: 1,
        savingsCount: 0,
        savingsMessage: '',
      }),
    });

    render(<SimplifiedPaymentPlan address="0xTest" />);

    await waitFor(() => {
      expect(screen.getByText('Copy Link')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Copy Link'));

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalled();
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('should call onClose when close button clicked', async () => {
    const onClose = jest.fn();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        simplifiedPayments: [
          { from: 'Alice', to: 'You', amount: 50 },
        ],
        originalCount: 1,
        simplifiedCount: 1,
        savingsCount: 0,
        savingsMessage: '',
      }),
    });

    render(<SimplifiedPaymentPlan address="0xTest" onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Close')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('should display summary with original and simplified counts', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        simplifiedPayments: [
          { from: 'Alice', to: 'You', amount: 100 },
        ],
        originalCount: 5,
        simplifiedCount: 1,
        savingsCount: 4,
        savingsMessage: '1 payment instead of 5',
      }),
    });

    render(<SimplifiedPaymentPlan address="0xTest" />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument(); // Original count
      expect(screen.getByText('1')).toBeInTheDocument(); // Simplified count
    });
  });

  it('should pass email parameter in fetch request', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        simplifiedPayments: [],
        originalCount: 0,
        simplifiedCount: 0,
        savingsCount: 0,
        savingsMessage: '',
      }),
    });

    render(<SimplifiedPaymentPlan address="0xTest" email="test@example.com" />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('email=test%40example.com')
      );
    });
  });
});
