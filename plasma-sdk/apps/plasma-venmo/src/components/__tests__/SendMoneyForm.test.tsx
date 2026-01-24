/**
 * SendMoneyForm Component Tests
 * Tests for the main payment form component
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SendMoneyForm from '../SendMoneyForm';

// Mock the hooks
jest.mock('@/hooks/useContacts', () => ({
  useContacts: jest.fn(() => ({
    contacts: [],
    recentContacts: [],
    loading: false,
    error: null,
    addContact: jest.fn(),
    updateContact: jest.fn(),
    toggleFavorite: jest.fn(),
    deleteContact: jest.fn(),
    updateLastPayment: jest.fn(),
  })),
}));

jest.mock('@/lib/send', () => ({
  sendMoney: jest.fn(),
}));

jest.mock('@plasma-pay/privy-auth', () => ({
  usePlasmaWallet: jest.fn(() => ({
    wallet: { address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' },
    authenticated: true,
    ready: true,
    user: { email: { address: 'test@example.com' } },
  })),
  useUSDT0Balance: jest.fn(() => ({
    balance: '100000000',
    formatted: '100.00',
    refresh: jest.fn(),
  })),
}));

describe('SendMoneyForm', () => {
  const mockWallet = {
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  } as any;

  const defaultProps = {
    wallet: mockWallet,
    balance: '100.00',
    contacts: [],
    contactsLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the form', () => {
    render(<SendMoneyForm {...defaultProps} />);

    expect(screen.getByLabelText(/recipient/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('should show validation error when recipient is empty', async () => {
    render(<SendMoneyForm {...defaultProps} />);

    const amountInput = screen.getByLabelText(/amount/i);
    fireEvent.change(amountInput, { target: { value: '10.00' } });

    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/recipient is required/i)).toBeInTheDocument();
    });
  });

  it('should show validation error when amount is empty', async () => {
    render(<SendMoneyForm {...defaultProps} />);

    const recipientInput = screen.getByLabelText(/recipient/i);
    fireEvent.change(recipientInput, {
      target: { value: 'test@example.com' },
    });

    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/amount is required/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for amount below minimum', async () => {
    render(<SendMoneyForm {...defaultProps} />);

    const recipientInput = screen.getByLabelText(/recipient/i);
    fireEvent.change(recipientInput, {
      target: { value: 'test@example.com' },
    });

    const amountInput = screen.getByLabelText(/amount/i);
    fireEvent.change(amountInput, { target: { value: '0.001' } });

    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/minimum.*0.01/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for amount above maximum', async () => {
    render(<SendMoneyForm {...defaultProps} />);

    const recipientInput = screen.getByLabelText(/recipient/i);
    fireEvent.change(recipientInput, {
      target: { value: 'test@example.com' },
    });

    const amountInput = screen.getByLabelText(/amount/i);
    fireEvent.change(amountInput, { target: { value: '10001.00' } });

    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/maximum.*10000/i)).toBeInTheDocument();
    });
  });

  it('should disable send button when loading', () => {
    render(<SendMoneyForm {...defaultProps} contactsLoading={true} />);

    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeDisabled();
  });

  it('should display balance', () => {
    render(<SendMoneyForm {...defaultProps} balance="50.25" />);

    expect(screen.getByText(/50\.25/i)).toBeInTheDocument();
  });

  it('should show recent contacts', () => {
    const mockContacts = [
      {
        id: '1',
        name: 'Alice',
        contactAddress: '0x' + 'a'.repeat(40),
        isFavorite: false,
        lastPayment: new Date().toISOString(),
      },
      {
        id: '2',
        name: 'Bob',
        contactAddress: '0x' + 'b'.repeat(40),
        isFavorite: true,
        lastPayment: new Date().toISOString(),
      },
    ];

    render(
      <SendMoneyForm
        {...defaultProps}
        contacts={mockContacts}
        recentContacts={mockContacts.slice(0, 1)}
      />
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('should populate recipient when contact is clicked', async () => {
    const mockContact = {
      id: '1',
      name: 'Alice',
      contactAddress: '0x' + 'a'.repeat(40),
      isFavorite: false,
      lastPayment: new Date().toISOString(),
    };

    render(
      <SendMoneyForm
        {...defaultProps}
        contacts={[mockContact]}
        recentContacts={[mockContact]}
      />
    );

    const aliceButton = screen.getByText('Alice');
    fireEvent.click(aliceButton);

    await waitFor(() => {
      const recipientInput = screen.getByLabelText(/recipient/i);
      expect(recipientInput).toHaveValue(mockContact.contactAddress);
    });
  });

  it('should not show memo field by default', () => {
    render(<SendMoneyForm {...defaultProps} />);

    expect(screen.queryByLabelText(/memo/i)).not.toBeInTheDocument();
  });

  it('should show confirmation modal before sending', async () => {
    render(<SendMoneyForm {...defaultProps} />);

    const recipientInput = screen.getByLabelText(/recipient/i);
    fireEvent.change(recipientInput, {
      target: { value: 'test@example.com' },
    });

    const amountInput = screen.getByLabelText(/amount/i);
    fireEvent.change(amountInput, { target: { value: '10.00' } });

    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/confirm payment/i)).toBeInTheDocument();
      expect(screen.getByText(/10\.00/i)).toBeInTheDocument();
    });
  });
});
