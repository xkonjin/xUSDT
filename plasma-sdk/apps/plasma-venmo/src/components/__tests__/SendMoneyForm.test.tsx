import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SendMoneyForm } from '../SendMoneyForm';

jest.mock('@/lib/send', () => ({
  sendMoney: jest.fn(),
}));

jest.mock('@/lib/sounds', () => ({
  playSound: jest.fn(),
  hapticFeedback: jest.fn(),
}));

jest.mock('@plasma-pay/ui', () => ({
  useAssistantReaction: () => ({
    onSuccess: jest.fn(),
    onError: jest.fn(),
    onLoading: jest.fn(),
  }),
  PaymentProgress: ({ status }: { status: string }) => <div>PaymentProgress {status}</div>,
}));

describe('SendMoneyForm', () => {
  const mockWallet = {
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7',
  } as any;

  const baseProps = {
    wallet: mockWallet,
    balance: '100.00',
    contacts: [],
    contactsLoading: false,
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the form inputs and review button', () => {
    render(<SendMoneyForm {...baseProps} />);

    expect(screen.getByText('Send Money')).toBeInTheDocument();
    expect(
      screen.getByLabelText(/recipient email, phone, or wallet address/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/payment amount in usd/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /review payment/i })).toBeInTheDocument();
  });

  it('keeps submit disabled until recipient and amount are valid', () => {
    render(<SendMoneyForm {...baseProps} />);

    const submitButton = screen.getByRole('button', { name: /review payment/i });
    const recipientInput = screen.getByLabelText(
      /recipient email, phone, or wallet address/i
    );
    const amountInput = screen.getByLabelText(/payment amount in usd/i);

    expect(submitButton).toBeDisabled();

    fireEvent.change(recipientInput, { target: { value: 'friend@example.com' } });
    fireEvent.change(amountInput, { target: { value: '10' } });

    expect(
      screen.getByRole('button', { name: /review \$10\.00 payment/i })
    ).toBeEnabled();
  });

  it('shows invalid recipient guidance and blocks submit for malformed recipient', () => {
    render(<SendMoneyForm {...baseProps} />);

    const recipientInput = screen.getByLabelText(
      /recipient email, phone, or wallet address/i
    );
    const amountInput = screen.getByLabelText(/payment amount in usd/i);

    fireEvent.change(recipientInput, { target: { value: 'not-a-recipient' } });
    fireEvent.change(amountInput, { target: { value: '10' } });

    expect(screen.getByText(/enter a valid email, phone, or wallet address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /review \$10\.00 payment/i })).toBeDisabled();
  });

  it('shows minimum amount validation after submit', async () => {
    render(<SendMoneyForm {...baseProps} />);

    const recipientInput = screen.getByLabelText(
      /recipient email, phone, or wallet address/i
    );
    const amountInput = screen.getByLabelText(/payment amount in usd/i);

    fireEvent.change(recipientInput, { target: { value: 'friend@example.com' } });
    fireEvent.change(amountInput, { target: { value: '0.001' } });

    fireEvent.click(screen.getByRole('button', { name: /review \$0\.00 payment/i }));

    await waitFor(() => {
      expect(screen.getByText(/minimum amount is \$0\.01/i)).toBeInTheDocument();
    });
  });

  it('opens confirmation modal on valid submit', async () => {
    render(<SendMoneyForm {...baseProps} />);

    const recipientInput = screen.getByLabelText(
      /recipient email, phone, or wallet address/i
    );
    const amountInput = screen.getByLabelText(/payment amount in usd/i);

    fireEvent.change(recipientInput, { target: { value: 'friend@example.com' } });
    fireEvent.change(amountInput, { target: { value: '12.5' } });

    fireEvent.click(screen.getByRole('button', { name: /review \$12\.50 payment/i }));

    await waitFor(() => {
      expect(screen.getByText('Confirm Payment')).toBeInTheDocument();
      expect(screen.getByText('$12.5')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^send$/i })).toBeInTheDocument();
    });
  });
});

