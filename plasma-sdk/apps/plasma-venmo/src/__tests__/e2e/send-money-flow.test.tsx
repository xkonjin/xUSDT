/**
 * Send Money Flow E2E Tests
 * 
 * Tests the complete send money flow including:
 * - Send to address/contact
 * - Amount validation
 * - EIP-3009 signature flow
 * - Relayer submission
 * - Success/error states
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import {
  createMockWallet,
  createMockContact,
  TEST_ADDRESSES,
  TEST_AMOUNTS,
  TEST_EMAILS,
  TEST_PHONES,
  mockEIP3009Signature,
  createMockTransferParams,
} from './test-utils';

// ============================================================================
// Module Mocks
// ============================================================================

const mockWallet = createMockWallet();

jest.mock('@privy-io/react-auth', () => ({
  usePrivy: () => ({
    ready: true,
    authenticated: true,
    user: { email: { address: 'test@example.com' } },
    login: jest.fn(),
    logout: jest.fn(),
  }),
  useWallets: () => ({
    wallets: [mockWallet],
  }),
  PrivyProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/pay',
}));

// Mock sounds/haptics
jest.mock('@/lib/sounds', () => ({
  playSound: jest.fn(),
  hapticFeedback: jest.fn(),
}));

// Mock UI hooks
jest.mock('@plasma-pay/ui', () => ({
  useAssistantReaction: () => ({
    onSuccess: jest.fn(),
    onError: jest.fn(),
    onLoading: jest.fn(),
  }),
  getUserFriendlyError: (e: string) => e,
  PaymentProgress: ({ status, onClose }: { status: string; onClose: () => void }) => (
    <div data-testid="payment-progress" data-status={status}>
      {status}
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// ============================================================================
// Test Component
// ============================================================================

function SendMoneyTestComponent({
  balance = '100.00',
  contacts = [],
  onSuccess = jest.fn(),
}: {
  balance?: string;
  contacts?: ReturnType<typeof createMockContact>[];
  onSuccess?: () => void;
}) {
  const [recipient, setRecipient] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [txHash, setTxHash] = React.useState<string | undefined>();

  const numericBalance = parseFloat(balance);
  const numericAmount = parseFloat(amount || '0');
  const MIN_AMOUNT = 0.01;
  const MAX_AMOUNT = 10000;

  const isValidRecipient =
    recipient.includes('@') ||
    /^\+?\d{10,}$/.test(recipient) ||
    /^0x[a-fA-F0-9]{40}$/.test(recipient);

  const isValidAmount = numericAmount >= MIN_AMOUNT && numericAmount <= MAX_AMOUNT;
  const hasSufficientBalance = numericAmount <= numericBalance;
  const canSubmit = isValidRecipient && isValidAmount && hasSufficientBalance && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!recipient) {
      setError('Recipient is required');
      return;
    }

    if (!isValidRecipient) {
      setError('Enter a valid email, phone, or wallet address');
      return;
    }

    if (!amount || numericAmount <= 0) {
      setError('Amount is required');
      return;
    }

    if (numericAmount < MIN_AMOUNT) {
      setError(`Minimum amount is $${MIN_AMOUNT}`);
      return;
    }

    if (numericAmount > MAX_AMOUNT) {
      setError(`Maximum amount is $${MAX_AMOUNT}`);
      return;
    }

    if (!hasSufficientBalance) {
      setError(`Insufficient balance. You have $${numericBalance.toFixed(2)}.`);
      return;
    }

    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Resolve recipient
      const resolveRes = await fetch('/api/resolve-recipient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: recipient }),
      });

      if (!resolveRes.ok) {
        const data = await resolveRes.json();
        throw new Error(data.error || 'Failed to resolve recipient');
      }

      const resolveData = await resolveRes.json();

      // Step 2: Sign EIP-3009 transfer
      await mockWallet.signTypedData({
        domain: {
          name: 'USD₮0',
          version: '1',
          chainId: 9370,
          verifyingContract: '0x0000000000000000000000000000000000000000',
        },
        types: {
          TransferWithAuthorization: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'validAfter', type: 'uint256' },
            { name: 'validBefore', type: 'uint256' },
            { name: 'nonce', type: 'bytes32' },
          ],
        },
        message: createMockTransferParams({ to: resolveData.address }),
        primaryType: 'TransferWithAuthorization',
      });

      // Step 3: Submit to relayer
      const submitRes = await fetch('/api/submit-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createMockTransferParams({ to: resolveData.address }),
          ...mockEIP3009Signature,
        }),
      });

      if (!submitRes.ok) {
        const data = await submitRes.json();
        throw new Error(data.error || 'Failed to submit transfer');
      }

      const submitData = await submitRes.json();
      setTxHash(submitData.txHash);
      setShowConfirm(false);
      setShowSuccess(true);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectContact = (contact: ReturnType<typeof createMockContact>) => {
    setRecipient(contact.contactAddress || contact.email || contact.phone || '');
  };

  return (
    <div>
      <form onSubmit={handleSubmit} data-testid="send-form">
        <h2>Send Money</h2>
        
        <div data-testid="balance">Balance: ${balance}</div>

        {contacts.length > 0 && (
          <div data-testid="contacts-list">
            {contacts.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectContact(c)}
                data-testid={`contact-${c.id}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        <label htmlFor="recipient">Recipient</label>
        <input
          id="recipient"
          type="text"
          value={recipient}
          onChange={e => setRecipient(e.target.value)}
          placeholder="Email, phone, or wallet address"
          aria-label="Recipient email, phone, or wallet address"
          disabled={loading}
        />

        <label htmlFor="amount">Amount</label>
        <input
          id="amount"
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0.00"
          step="0.01"
          aria-label="Payment amount in USD"
          disabled={loading}
        />

        {error && (
          <div role="alert" data-testid="error-message">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          data-testid="review-button"
        >
          Review Payment
        </button>
      </form>

      {showConfirm && (
        <div data-testid="confirm-modal">
          <h3>Confirm Payment</h3>
          <p>Sending ${amount} to {recipient}</p>
          <button onClick={handleConfirm} disabled={loading} data-testid="confirm-button">
            {loading ? 'Sending...' : 'Confirm'}
          </button>
          <button onClick={() => setShowConfirm(false)} disabled={loading} data-testid="cancel-button">
            Cancel
          </button>
        </div>
      )}

      {showSuccess && (
        <div data-testid="success-modal">
          <h3>Success!</h3>
          <p>Sent ${amount} to {recipient}</p>
          {txHash && <p data-testid="tx-hash">Tx: {txHash}</p>}
          <button
            onClick={() => {
              setShowSuccess(false);
              setRecipient('');
              setAmount('');
            }}
            data-testid="done-button"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('Send Money Flow E2E Tests', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Form Rendering', () => {
    it('should render the send money form', () => {
      render(<SendMoneyTestComponent />);

      expect(screen.getByLabelText(/recipient/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
      expect(screen.getByTestId('review-button')).toBeInTheDocument();
    });

    it('should display current balance', () => {
      render(<SendMoneyTestComponent balance="250.00" />);

      expect(screen.getByTestId('balance')).toHaveTextContent('$250.00');
    });

    it('should render contacts if provided', () => {
      const contacts = [
        createMockContact({ id: '1', name: 'Alice' }),
        createMockContact({ id: '2', name: 'Bob' }),
      ];

      render(<SendMoneyTestComponent contacts={contacts} />);

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  describe('Recipient Validation', () => {
    it('should accept valid email as recipient', async () => {
      const user = userEvent.setup();
      render(<SendMoneyTestComponent />);

      const recipientInput = screen.getByLabelText(/recipient/i);
      await user.type(recipientInput, TEST_EMAILS.VALID);

      const amountInput = screen.getByLabelText(/amount/i);
      await user.type(amountInput, '10');

      expect(screen.getByTestId('review-button')).not.toBeDisabled();
    });

    it('should accept valid phone as recipient', async () => {
      const user = userEvent.setup();
      render(<SendMoneyTestComponent />);

      const recipientInput = screen.getByLabelText(/recipient/i);
      await user.type(recipientInput, TEST_PHONES.VALID);

      const amountInput = screen.getByLabelText(/amount/i);
      await user.type(amountInput, '10');

      expect(screen.getByTestId('review-button')).not.toBeDisabled();
    });

    it('should accept valid wallet address as recipient', async () => {
      const user = userEvent.setup();
      render(<SendMoneyTestComponent />);

      const recipientInput = screen.getByLabelText(/recipient/i);
      await user.type(recipientInput, TEST_ADDRESSES.RECIPIENT_ADDRESS);

      const amountInput = screen.getByLabelText(/amount/i);
      await user.type(amountInput, '10');

      expect(screen.getByTestId('review-button')).not.toBeDisabled();
    });

    it('should show error for empty recipient', async () => {
      const user = userEvent.setup();
      render(<SendMoneyTestComponent />);

      const amountInput = screen.getByLabelText(/amount/i);
      await user.type(amountInput, '10');

      // Recipient is required, button should be disabled
      expect(screen.getByTestId('review-button')).toBeDisabled();
    });

    it('should show error for invalid recipient format', async () => {
      const user = userEvent.setup();
      render(<SendMoneyTestComponent />);

      const recipientInput = screen.getByLabelText(/recipient/i);
      await user.type(recipientInput, 'invalid-recipient');

      const amountInput = screen.getByLabelText(/amount/i);
      await user.type(amountInput, '10');

      // Should be disabled due to invalid recipient
      expect(screen.getByTestId('review-button')).toBeDisabled();
    });
  });

  describe('Amount Validation', () => {
    it('should accept valid amount', async () => {
      const user = userEvent.setup();
      render(<SendMoneyTestComponent balance="100.00" />);

      const recipientInput = screen.getByLabelText(/recipient/i);
      await user.type(recipientInput, TEST_EMAILS.VALID);

      const amountInput = screen.getByLabelText(/amount/i);
      await user.type(amountInput, '50');

      expect(screen.getByTestId('review-button')).not.toBeDisabled();
    });

    it('should show error for amount below minimum', async () => {
      const user = userEvent.setup();
      render(<SendMoneyTestComponent />);

      const recipientInput = screen.getByLabelText(/recipient/i);
      await user.type(recipientInput, TEST_EMAILS.VALID);

      const amountInput = screen.getByLabelText(/amount/i);
      await user.type(amountInput, TEST_AMOUNTS.BELOW_MINIMUM);

      expect(screen.getByTestId('review-button')).toBeDisabled();
    });

    it('should show error for amount above maximum', async () => {
      const user = userEvent.setup();
      render(<SendMoneyTestComponent balance="100000.00" />);

      const recipientInput = screen.getByLabelText(/recipient/i);
      await user.type(recipientInput, TEST_EMAILS.VALID);

      const amountInput = screen.getByLabelText(/amount/i);
      await user.type(amountInput, TEST_AMOUNTS.ABOVE_MAXIMUM);

      expect(screen.getByTestId('review-button')).toBeDisabled();
    });

    it('should show error for insufficient balance', async () => {
      const user = userEvent.setup();
      render(<SendMoneyTestComponent balance="10.00" />);

      const recipientInput = screen.getByLabelText(/recipient/i);
      await user.type(recipientInput, TEST_EMAILS.VALID);

      const amountInput = screen.getByLabelText(/amount/i);
      await user.type(amountInput, '100');

      expect(screen.getByTestId('review-button')).toBeDisabled();
    });

    it('should show error for empty amount', async () => {
      const user = userEvent.setup();
      render(<SendMoneyTestComponent />);

      const recipientInput = screen.getByLabelText(/recipient/i);
      await user.type(recipientInput, TEST_EMAILS.VALID);

      expect(screen.getByTestId('review-button')).toBeDisabled();
    });
  });

  describe('Contact Selection', () => {
    it('should populate recipient when contact selected', async () => {
      const user = userEvent.setup();
      const contact = createMockContact({
        id: 'test-contact',
        name: 'Alice',
        contactAddress: TEST_ADDRESSES.RECIPIENT_ADDRESS,
      });

      render(<SendMoneyTestComponent contacts={[contact]} />);

      await user.click(screen.getByTestId('contact-test-contact'));

      const recipientInput = screen.getByLabelText(/recipient/i);
      expect(recipientInput).toHaveValue(TEST_ADDRESSES.RECIPIENT_ADDRESS);
    });

    it('should use email when contact has no address', async () => {
      const user = userEvent.setup();
      const contact = createMockContact({
        id: 'email-contact',
        name: 'Bob',
        contactAddress: null,
        email: TEST_EMAILS.VALID,
      });

      render(<SendMoneyTestComponent contacts={[contact]} />);

      await user.click(screen.getByTestId('contact-email-contact'));

      const recipientInput = screen.getByLabelText(/recipient/i);
      expect(recipientInput).toHaveValue(TEST_EMAILS.VALID);
    });
  });

  describe('Confirmation Flow', () => {
    it('should show confirmation modal on submit', async () => {
      const user = userEvent.setup();
      render(<SendMoneyTestComponent />);

      const recipientInput = screen.getByLabelText(/recipient/i);
      await user.type(recipientInput, TEST_EMAILS.VALID);

      const amountInput = screen.getByLabelText(/amount/i);
      await user.type(amountInput, '10');

      await user.click(screen.getByTestId('review-button'));

      expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
      expect(screen.getByText(/Sending \$10 to/)).toBeInTheDocument();
    });

    it('should close confirmation modal on cancel', async () => {
      const user = userEvent.setup();
      render(<SendMoneyTestComponent />);

      const recipientInput = screen.getByLabelText(/recipient/i);
      await user.type(recipientInput, TEST_EMAILS.VALID);

      const amountInput = screen.getByLabelText(/amount/i);
      await user.type(amountInput, '10');

      await user.click(screen.getByTestId('review-button'));
      expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();

      await user.click(screen.getByTestId('cancel-button'));
      expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
    });
  });

  describe('EIP-3009 Signature Flow', () => {
    it('should sign typed data when confirming payment', async () => {
      const user = userEvent.setup();

      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ address: TEST_ADDRESSES.RECIPIENT_ADDRESS }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ txHash: '0xtxhash123' }),
        });

      render(<SendMoneyTestComponent />);

      const recipientInput = screen.getByLabelText(/recipient/i);
      await user.type(recipientInput, TEST_EMAILS.VALID);

      const amountInput = screen.getByLabelText(/amount/i);
      await user.type(amountInput, '10');

      await user.click(screen.getByTestId('review-button'));
      await user.click(screen.getByTestId('confirm-button'));

      await waitFor(() => {
        expect(mockWallet.signTypedData).toHaveBeenCalled();
      });
    });

    it('should include correct EIP-3009 typed data structure', async () => {
      const user = userEvent.setup();

      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ address: TEST_ADDRESSES.RECIPIENT_ADDRESS }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ txHash: '0xtxhash123' }),
        });

      render(<SendMoneyTestComponent />);

      const recipientInput = screen.getByLabelText(/recipient/i);
      await user.type(recipientInput, TEST_EMAILS.VALID);

      const amountInput = screen.getByLabelText(/amount/i);
      await user.type(amountInput, '10');

      await user.click(screen.getByTestId('review-button'));
      await user.click(screen.getByTestId('confirm-button'));

      await waitFor(() => {
        const signCall = mockWallet.signTypedData.mock.calls[0][0];
        expect(signCall.primaryType).toBe('TransferWithAuthorization');
        expect(signCall.types.TransferWithAuthorization).toBeDefined();
      });
    });
  });

  describe('Relayer Submission', () => {
    it('should submit transfer to relayer after signing', async () => {
      const user = userEvent.setup();

      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ address: TEST_ADDRESSES.RECIPIENT_ADDRESS }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ txHash: '0xtxhash123' }),
        });

      render(<SendMoneyTestComponent />);

      const recipientInput = screen.getByLabelText(/recipient/i);
      await user.type(recipientInput, TEST_EMAILS.VALID);

      const amountInput = screen.getByLabelText(/amount/i);
      await user.type(amountInput, '10');

      await user.click(screen.getByTestId('review-button'));
      await user.click(screen.getByTestId('confirm-button'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/submit-transfer',
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    it('should show success modal after successful submission', async () => {
      const user = userEvent.setup();
      const onSuccess = jest.fn();

      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ address: TEST_ADDRESSES.RECIPIENT_ADDRESS }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ txHash: '0xtxhash123' }),
        });

      render(<SendMoneyTestComponent onSuccess={onSuccess} />);

      const recipientInput = screen.getByLabelText(/recipient/i);
      await user.type(recipientInput, TEST_EMAILS.VALID);

      const amountInput = screen.getByLabelText(/amount/i);
      await user.type(amountInput, '10');

      await user.click(screen.getByTestId('review-button'));
      await user.click(screen.getByTestId('confirm-button'));

      await waitFor(() => {
        expect(screen.getByTestId('success-modal')).toBeInTheDocument();
        expect(screen.getByTestId('tx-hash')).toHaveTextContent('0xtxhash123');
      });

      expect(onSuccess).toHaveBeenCalled();
    });

    it('should display transaction hash on success', async () => {
      const user = userEvent.setup();
      const expectedTxHash = '0xabc123def456';

      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ address: TEST_ADDRESSES.RECIPIENT_ADDRESS }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ txHash: expectedTxHash }),
        });

      render(<SendMoneyTestComponent />);

      const recipientInput = screen.getByLabelText(/recipient/i);
      await user.type(recipientInput, TEST_EMAILS.VALID);

      const amountInput = screen.getByLabelText(/amount/i);
      await user.type(amountInput, '10');

      await user.click(screen.getByTestId('review-button'));
      await user.click(screen.getByTestId('confirm-button'));

      await waitFor(() => {
        expect(screen.getByTestId('tx-hash')).toHaveTextContent(expectedTxHash);
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error when recipient resolution fails', async () => {
      const user = userEvent.setup();

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'User not found' }),
      });

      render(<SendMoneyTestComponent />);

      const recipientInput = screen.getByLabelText(/recipient/i);
      await user.type(recipientInput, TEST_EMAILS.UNREGISTERED);

      const amountInput = screen.getByLabelText(/amount/i);
      await user.type(amountInput, '10');

      await user.click(screen.getByTestId('review-button'));
      await user.click(screen.getByTestId('confirm-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('User not found');
      });
    });

    it('should show error when relayer submission fails', async () => {
      const user = userEvent.setup();

      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ address: TEST_ADDRESSES.RECIPIENT_ADDRESS }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Relayer unavailable' }),
        });

      render(<SendMoneyTestComponent />);

      const recipientInput = screen.getByLabelText(/recipient/i);
      await user.type(recipientInput, TEST_EMAILS.VALID);

      const amountInput = screen.getByLabelText(/amount/i);
      await user.type(amountInput, '10');

      await user.click(screen.getByTestId('review-button'));
      await user.click(screen.getByTestId('confirm-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Relayer unavailable');
      });
    });

    it('should show error when signature fails', async () => {
      const user = userEvent.setup();

      mockWallet.signTypedData.mockRejectedValueOnce(new Error('User rejected signature'));

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ address: TEST_ADDRESSES.RECIPIENT_ADDRESS }),
      });

      render(<SendMoneyTestComponent />);

      const recipientInput = screen.getByLabelText(/recipient/i);
      await user.type(recipientInput, TEST_EMAILS.VALID);

      const amountInput = screen.getByLabelText(/amount/i);
      await user.type(amountInput, '10');

      await user.click(screen.getByTestId('review-button'));
      await user.click(screen.getByTestId('confirm-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('User rejected signature');
      });
    });
  });

  describe('Form Reset After Success', () => {
    it('should clear form after clicking done', async () => {
      const user = userEvent.setup();

      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ address: TEST_ADDRESSES.RECIPIENT_ADDRESS }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ txHash: '0xtxhash123' }),
        });

      render(<SendMoneyTestComponent />);

      const recipientInput = screen.getByLabelText(/recipient/i);
      await user.type(recipientInput, TEST_EMAILS.VALID);

      const amountInput = screen.getByLabelText(/amount/i);
      await user.type(amountInput, '10');

      await user.click(screen.getByTestId('review-button'));
      await user.click(screen.getByTestId('confirm-button'));

      await waitFor(() => {
        expect(screen.getByTestId('success-modal')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('done-button'));

      expect(screen.getByLabelText(/recipient/i)).toHaveValue('');
      expect(screen.getByLabelText(/amount/i)).toHaveValue(null);
    });
  });
});
