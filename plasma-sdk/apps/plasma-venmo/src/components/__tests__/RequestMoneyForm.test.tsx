import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RequestMoneyForm } from '../RequestMoneyForm';

// Mock fetch used by the component.
global.fetch = jest.fn();

describe('RequestMoneyForm', () => {
  const mockWalletAddress =
    '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7' as `0x${string}`;
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        paymentLink: { id: '123', url: 'https://example.com/pay/123' },
      }),
    });
  });

  it('renders the request money form', () => {
    render(
      <RequestMoneyForm walletAddress={mockWalletAddress} onSuccess={mockOnSuccess} />
    );

    expect(
      screen.getByRole('heading', { name: 'Request Money' })
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Dinner, rent, etc.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create request link/i })
    ).toBeInTheDocument();
  });

  it('disables submit button when wallet is not connected', () => {
    render(<RequestMoneyForm walletAddress={undefined} onSuccess={mockOnSuccess} />);

    const form = document.querySelector('form')!;
    const submitButton = within(form).getByRole('button', {
      name: /create request link/i,
    });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when amount is valid', async () => {
    const user = userEvent.setup();
    render(
      <RequestMoneyForm walletAddress={mockWalletAddress} onSuccess={mockOnSuccess} />
    );

    const amountInput = screen.getByPlaceholderText('0.00');
    await user.type(amountInput, '10');

    const form = document.querySelector('form')!;
    const submitButton = within(form).getByRole('button', {
      name: /create request link/i,
    });
    expect(submitButton).toBeEnabled();
  });

  it('disables submit button when amount is zero', async () => {
    const user = userEvent.setup();
    render(
      <RequestMoneyForm walletAddress={mockWalletAddress} onSuccess={mockOnSuccess} />
    );

    const amountInput = screen.getByPlaceholderText('0.00');
    await user.type(amountInput, '0');

    const form = document.querySelector('form')!;
    const submitButton = within(form).getByRole('button', {
      name: /create request link/i,
    });
    expect(submitButton).toBeDisabled();
  });

  it('submits request successfully and shows share UI', async () => {
    const user = userEvent.setup();
    render(
      <RequestMoneyForm walletAddress={mockWalletAddress} onSuccess={mockOnSuccess} />
    );

    const amountInput = screen.getByPlaceholderText('0.00');
    await user.type(amountInput, '25');

    const submitButton = screen.getByRole('button', { name: /create request link/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/payment-links',
        expect.objectContaining({ method: 'POST' })
      );
    });

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(
        screen.getByRole('heading', { name: 'Share Your Request' })
      ).toBeInTheDocument();
      expect(screen.getByText(/request link created for \$25/i)).toBeInTheDocument();
      expect(screen.getByText('https://example.com/pay/123')).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to create request' }),
    });

    const user = userEvent.setup();
    render(
      <RequestMoneyForm walletAddress={mockWalletAddress} onSuccess={mockOnSuccess} />
    );

    const amountInput = screen.getByPlaceholderText('0.00');
    await user.type(amountInput, '25');

    const submitButton = screen.getByRole('button', { name: /create request link/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to create request');
    });
  });
});
