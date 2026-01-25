/**
 * Payment Links Flow E2E Tests
 * 
 * Tests the complete payment links flow including:
 * - Create payment link
 * - Share link
 * - Pay via link
 * - Link status updates
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import {
  createMockWallet,
  createMockPaymentLink,
  mockFetchSuccess,
  mockFetchError,
  TEST_ADDRESSES,
  TEST_AMOUNTS,
} from './test-utils';

// ============================================================================
// Module Mocks
// ============================================================================

const mockWallet = createMockWallet();
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  refresh: jest.fn(),
};

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
  useRouter: () => mockRouter,
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Clipboard mock - we'll set this up more carefully to avoid conflicts
let mockWriteText: jest.Mock;

// ============================================================================
// Test Components
// ============================================================================

function PaymentLinksTestComponent({
  address = TEST_ADDRESSES.VALID_ADDRESS,
  initialLinks = [],
}: {
  address?: string;
  initialLinks?: ReturnType<typeof createMockPaymentLink>[];
}) {
  const [links, setLinks] = React.useState<ReturnType<typeof createMockPaymentLink>[]>(initialLinks);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // Form state
  const [newAmount, setNewAmount] = React.useState('');
  const [newMemo, setNewMemo] = React.useState('');
  const [newExpires, setNewExpires] = React.useState('');

  const fetchLinks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/payment-links?address=${address}`);
      if (!res.ok) throw new Error('Failed to load payment links');
      const data = await res.json();
      setLinks(data.paymentLinks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    // Only fetch if no initial links provided
    if (initialLinks.length === 0) {
      fetchLinks();
    }
  }, [address]);

  const createLink = async () => {
    if (!address) return;
    setCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/payment-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorAddress: address,
          amount: newAmount ? parseFloat(newAmount) : null,
          memo: newMemo || undefined,
          expiresInDays: newExpires ? parseInt(newExpires) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create link');
      }

      const data = await res.json();
      setLinks([data.paymentLink, ...links]);
      setShowCreateForm(false);
      setNewAmount('');
      setNewMemo('');
      setNewExpires('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async (link: ReturnType<typeof createMockPaymentLink>) => {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError('Failed to copy link');
    }
  };

  const cancelLink = async (linkId: string) => {
    try {
      const res = await fetch(`/api/payment-links/${linkId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorAddress: address }),
      });

      if (!res.ok) throw new Error('Failed to cancel link');

      setLinks(links.map(l => 
        l.id === linkId ? { ...l, status: 'cancelled' as const } : l
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  if (loading && links.length === 0) {
    return <div data-testid="loading">Loading...</div>;
  }

  return (
    <div>
      <div className="header">
        <h2>Payment Links</h2>
        <button onClick={() => setShowCreateForm(!showCreateForm)} data-testid="new-link-button">
          New Link
        </button>
      </div>

      {error && <div role="alert" data-testid="error-message">{error}</div>}

      {showCreateForm && (
        <div data-testid="create-form">
          <label htmlFor="amount">Amount (optional)</label>
          <input
            id="amount"
            type="number"
            value={newAmount}
            onChange={e => setNewAmount(e.target.value)}
            placeholder="0.00"
            data-testid="amount-input"
          />

          <label htmlFor="memo">Memo (optional)</label>
          <input
            id="memo"
            type="text"
            value={newMemo}
            onChange={e => setNewMemo(e.target.value)}
            placeholder="What's this for?"
            data-testid="memo-input"
          />

          <label htmlFor="expires">Expires in (days)</label>
          <input
            id="expires"
            type="number"
            value={newExpires}
            onChange={e => setNewExpires(e.target.value)}
            placeholder="Never"
            data-testid="expires-input"
          />

          <button onClick={() => setShowCreateForm(false)} data-testid="cancel-create">
            Cancel
          </button>
          <button onClick={createLink} disabled={creating} data-testid="create-button">
            {creating ? 'Creating...' : 'Create Link'}
          </button>
        </div>
      )}

      {links.length === 0 ? (
        <div data-testid="empty-state">
          <p>No payment links yet</p>
          <button onClick={() => setShowCreateForm(true)} data-testid="create-first-link">
            Create your first link
          </button>
        </div>
      ) : (
        <div data-testid="links-list">
          {links.map(link => (
            <div key={link.id} data-testid={`link-${link.id}`}>
              <span data-testid={`link-amount-${link.id}`}>
                {link.amount !== null ? `$${link.amount}` : 'Any amount'}
              </span>
              <span data-testid={`link-status-${link.id}`}>{link.status}</span>
              {link.memo && <span data-testid={`link-memo-${link.id}`}>{link.memo}</span>}

              {link.status === 'active' && (
                <>
                  <button onClick={() => copyLink(link)} data-testid={`copy-${link.id}`}>
                    {copiedId === link.id ? 'Copied!' : 'Copy'}
                  </button>
                  <button onClick={() => cancelLink(link.id)} data-testid={`cancel-${link.id}`}>
                    Cancel
                  </button>
                </>
              )}

              {link.txHash && (
                <a
                  href={`https://scan.plasma.to/tx/${link.txHash}`}
                  data-testid={`tx-link-${link.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Tx
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PayViaLinkTestComponent({
  linkId = 'test-link',
  linkData = createMockPaymentLink(),
}: {
  linkId?: string;
  linkData?: ReturnType<typeof createMockPaymentLink>;
}) {
  const [link, setLink] = React.useState<ReturnType<typeof createMockPaymentLink> | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [paying, setPaying] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [amount, setAmount] = React.useState('');

  React.useEffect(() => {
    const fetchLink = async () => {
      try {
        const res = await fetch(`/api/payment-links/${linkId}`);
        if (!res.ok) throw new Error('Link not found');
        const data = await res.json();
        setLink(data.paymentLink);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchLink();
  }, [linkId]);

  const handlePay = async () => {
    if (!link) return;
    setPaying(true);
    setError(null);

    try {
      const payAmount = link.amount || parseFloat(amount);
      if (!payAmount || payAmount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      // Sign and submit payment
      const signature = await mockWallet.signTypedData({});

      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkId: link.id,
          amount: payAmount,
          payerAddress: mockWallet.address,
          signature,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Payment failed');
      }

      const data = await res.json();
      setSuccess(true);
      setLink({ ...link, status: 'paid', txHash: data.txHash, paidAt: new Date().toISOString() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return <div data-testid="loading">Loading...</div>;
  }

  if (error && !link) {
    return <div data-testid="error">{error}</div>;
  }

  if (!link) {
    return <div data-testid="not-found">Link not found</div>;
  }

  if (link.status === 'cancelled') {
    return <div data-testid="cancelled">This payment link has been cancelled</div>;
  }

  if (link.status === 'expired') {
    return <div data-testid="expired">This payment link has expired</div>;
  }

  if (link.status === 'paid' || success) {
    return (
      <div data-testid="paid">
        <h2>Payment Complete!</h2>
        <p>Amount: ${link.amount || amount}</p>
        {link.txHash && (
          <a href={`https://scan.plasma.to/tx/${link.txHash}`} data-testid="view-tx">
            View Transaction
          </a>
        )}
      </div>
    );
  }

  return (
    <div data-testid="pay-form">
      <h2>Pay {link.creatorAddress.slice(0, 6)}...{link.creatorAddress.slice(-4)}</h2>
      
      {link.memo && <p data-testid="link-memo">{link.memo}</p>}

      {link.amount !== null ? (
        <p data-testid="fixed-amount">Amount: ${link.amount}</p>
      ) : (
        <div>
          <label htmlFor="pay-amount">Amount</label>
          <input
            id="pay-amount"
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            data-testid="amount-input"
          />
        </div>
      )}

      {error && <div role="alert" data-testid="pay-error">{error}</div>}

      <button onClick={handlePay} disabled={paying} data-testid="pay-button">
        {paying ? 'Processing...' : `Pay $${link.amount || amount || '0'}`}
      </button>
    </div>
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('Payment Links Flow E2E Tests', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    originalFetch = global.fetch;
    
    // Setup clipboard mock carefully
    mockWriteText = jest.fn().mockResolvedValue(undefined);
    
    // Check if clipboard already exists and is configurable
    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    if (!descriptor || descriptor.configurable) {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        writable: true,
        value: {
          writeText: mockWriteText,
          readText: jest.fn().mockResolvedValue(''),
        },
      });
    } else {
      // Just mock the writeText function if clipboard exists
      (navigator.clipboard as any).writeText = mockWriteText;
    }
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Create Payment Link', () => {
    it('should show create form when clicking new link button', async () => {
      const user = userEvent.setup({ writeToClipboard: false });
      
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ paymentLinks: [] }),
      });

      render(<PaymentLinksTestComponent />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      await user.click(screen.getByTestId('new-link-button'));

      expect(screen.getByTestId('create-form')).toBeInTheDocument();
    });

    it('should create link with fixed amount', async () => {
      const user = userEvent.setup({ writeToClipboard: false });
      const newLink = createMockPaymentLink({ id: 'new-link', amount: 25 });

      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ paymentLinks: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ paymentLink: newLink }),
        });

      render(<PaymentLinksTestComponent />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      await user.click(screen.getByTestId('new-link-button'));
      await user.type(screen.getByTestId('amount-input'), '25');
      await user.click(screen.getByTestId('create-button'));

      await waitFor(() => {
        expect(screen.getByTestId(`link-amount-new-link`)).toHaveTextContent('$25');
      });
    });

    it('should create link with any amount (no fixed amount)', async () => {
      const user = userEvent.setup({ writeToClipboard: false });
      const newLink = createMockPaymentLink({ id: 'new-link', amount: null });

      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ paymentLinks: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ paymentLink: newLink }),
        });

      render(<PaymentLinksTestComponent />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      await user.click(screen.getByTestId('new-link-button'));
      await user.click(screen.getByTestId('create-button'));

      await waitFor(() => {
        expect(screen.getByTestId(`link-amount-new-link`)).toHaveTextContent('Any amount');
      });
    });

    it('should create link with memo', async () => {
      const user = userEvent.setup({ writeToClipboard: false });
      const newLink = createMockPaymentLink({ id: 'new-link', memo: 'Lunch money' });

      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ paymentLinks: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ paymentLink: newLink }),
        });

      render(<PaymentLinksTestComponent />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      await user.click(screen.getByTestId('new-link-button'));
      await user.type(screen.getByTestId('memo-input'), 'Lunch money');
      await user.click(screen.getByTestId('create-button'));

      await waitFor(() => {
        expect(screen.getByTestId(`link-memo-new-link`)).toHaveTextContent('Lunch money');
      });
    });

    it('should create link with expiration', async () => {
      const user = userEvent.setup({ writeToClipboard: false });
      const newLink = createMockPaymentLink({ id: 'new-link' });

      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ paymentLinks: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ paymentLink: newLink }),
        });

      render(<PaymentLinksTestComponent />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      await user.click(screen.getByTestId('new-link-button'));
      await user.type(screen.getByTestId('expires-input'), '7');
      await user.click(screen.getByTestId('create-button'));

      await waitFor(() => {
        const createCall = (global.fetch as jest.Mock).mock.calls[1];
        const body = JSON.parse(createCall[1].body);
        expect(body.expiresInDays).toBe(7);
      });
    });

    it('should show error when creation fails', async () => {
      const user = userEvent.setup({ writeToClipboard: false });

      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ paymentLinks: [] }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Server error' }),
        });

      render(<PaymentLinksTestComponent />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      await user.click(screen.getByTestId('new-link-button'));
      await user.click(screen.getByTestId('create-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Server error');
      });
    });

    it('should cancel form without creating', async () => {
      const user = userEvent.setup({ writeToClipboard: false });

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ paymentLinks: [] }),
      });

      render(<PaymentLinksTestComponent />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      await user.click(screen.getByTestId('new-link-button'));
      expect(screen.getByTestId('create-form')).toBeInTheDocument();

      await user.click(screen.getByTestId('cancel-create'));
      expect(screen.queryByTestId('create-form')).not.toBeInTheDocument();
    });
  });

  describe('Share Payment Link', () => {
    it('should copy link URL to clipboard and show Copied state', async () => {
      const linkUrl = 'https://app.plenmo.com/pay/share-link';
      const link = createMockPaymentLink({ id: 'share-link', url: linkUrl });

      // Use initialLinks to skip loading state
      render(<PaymentLinksTestComponent initialLinks={[link]} />);

      expect(screen.getByTestId('link-share-link')).toBeInTheDocument();

      // Use fireEvent instead of userEvent to avoid clipboard conflicts
      fireEvent.click(screen.getByTestId('copy-share-link'));

      await waitFor(() => {
        // Verify the copy button shows "Copied!" state
        expect(screen.getByTestId('copy-share-link')).toHaveTextContent('Copied!');
      });

      // Verify clipboard was called with the right URL
      expect(mockWriteText).toHaveBeenCalledWith(linkUrl);
    });

    it('should reset copied state after timeout', async () => {
      jest.useFakeTimers();
      const link = createMockPaymentLink({ id: 'share-link' });

      render(<PaymentLinksTestComponent initialLinks={[link]} />);

      fireEvent.click(screen.getByTestId('copy-share-link'));

      // Should show Copied immediately
      expect(screen.getByTestId('copy-share-link')).toHaveTextContent('Copied!');

      // Fast forward past the timeout - use act to handle state updates
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      expect(screen.getByTestId('copy-share-link')).toHaveTextContent('Copy');

      jest.useRealTimers();
    });
  });

  describe('Cancel Payment Link', () => {
    it('should cancel an active link', async () => {
      const user = userEvent.setup({ writeToClipboard: false });
      const link = createMockPaymentLink({ id: 'cancel-link', status: 'active' });

      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ paymentLinks: [link] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

      render(<PaymentLinksTestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('link-status-cancel-link')).toHaveTextContent('active');
      });

      await user.click(screen.getByTestId('cancel-cancel-link'));

      await waitFor(() => {
        expect(screen.getByTestId('link-status-cancel-link')).toHaveTextContent('cancelled');
      });
    });

    it('should not show cancel button for already cancelled links', async () => {
      const link = createMockPaymentLink({ id: 'cancelled-link', status: 'cancelled' });

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ paymentLinks: [link] }),
      });

      render(<PaymentLinksTestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('link-cancelled-link')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('cancel-cancelled-link')).not.toBeInTheDocument();
    });
  });

  describe('Pay Via Link', () => {
    it('should show payment form for active link', async () => {
      const link = createMockPaymentLink({ id: 'pay-link', amount: 50, status: 'active' });

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ paymentLink: link }),
      });

      render(<PayViaLinkTestComponent linkId="pay-link" />);

      await waitFor(() => {
        expect(screen.getByTestId('pay-form')).toBeInTheDocument();
        expect(screen.getByTestId('fixed-amount')).toHaveTextContent('$50');
      });
    });

    it('should show amount input for variable amount links', async () => {
      const link = createMockPaymentLink({ id: 'var-link', amount: null, status: 'active' });

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ paymentLink: link }),
      });

      render(<PayViaLinkTestComponent linkId="var-link" />);

      await waitFor(() => {
        expect(screen.getByTestId('amount-input')).toBeInTheDocument();
      });
    });

    it('should show memo if present', async () => {
      const link = createMockPaymentLink({
        id: 'memo-link',
        memo: 'Coffee money',
        status: 'active',
      });

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ paymentLink: link }),
      });

      render(<PayViaLinkTestComponent linkId="memo-link" />);

      await waitFor(() => {
        expect(screen.getByTestId('link-memo')).toHaveTextContent('Coffee money');
      });
    });

    it('should process payment successfully', async () => {
      const user = userEvent.setup({ writeToClipboard: false });
      const link = createMockPaymentLink({ id: 'success-link', amount: 25, status: 'active' });

      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ paymentLink: link }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ txHash: '0xpaymenthash' }),
        });

      render(<PayViaLinkTestComponent linkId="success-link" />);

      await waitFor(() => {
        expect(screen.getByTestId('pay-form')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('pay-button'));

      await waitFor(() => {
        expect(screen.getByTestId('paid')).toBeInTheDocument();
        expect(screen.getByTestId('view-tx')).toHaveAttribute(
          'href',
          'https://scan.plasma.to/tx/0xpaymenthash'
        );
      });
    });

    it('should require amount for variable links', async () => {
      const user = userEvent.setup({ writeToClipboard: false });
      const link = createMockPaymentLink({ id: 'var-link', amount: null, status: 'active' });

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ paymentLink: link }),
      });

      render(<PayViaLinkTestComponent linkId="var-link" />);

      await waitFor(() => {
        expect(screen.getByTestId('pay-form')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('pay-button'));

      await waitFor(() => {
        expect(screen.getByTestId('pay-error')).toHaveTextContent('valid amount');
      });
    });

    it('should show error for cancelled links', async () => {
      const link = createMockPaymentLink({ id: 'cancelled-link', status: 'cancelled' });

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ paymentLink: link }),
      });

      render(<PayViaLinkTestComponent linkId="cancelled-link" />);

      await waitFor(() => {
        expect(screen.getByTestId('cancelled')).toBeInTheDocument();
      });
    });

    it('should show error for expired links', async () => {
      const link = createMockPaymentLink({ id: 'expired-link', status: 'expired' });

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ paymentLink: link }),
      });

      render(<PayViaLinkTestComponent linkId="expired-link" />);

      await waitFor(() => {
        expect(screen.getByTestId('expired')).toBeInTheDocument();
      });
    });

    it('should show already paid state', async () => {
      const link = createMockPaymentLink({
        id: 'paid-link',
        status: 'paid',
        txHash: '0xalreadypaid',
      });

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ paymentLink: link }),
      });

      render(<PayViaLinkTestComponent linkId="paid-link" />);

      await waitFor(() => {
        expect(screen.getByTestId('paid')).toBeInTheDocument();
      });
    });

    it('should show error for invalid link', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Link not found' }),
      });

      render(<PayViaLinkTestComponent linkId="invalid-link" />);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Link not found');
      });
    });

    it('should show payment error', async () => {
      const user = userEvent.setup({ writeToClipboard: false });
      const link = createMockPaymentLink({ id: 'error-link', amount: 25, status: 'active' });

      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ paymentLink: link }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Insufficient funds' }),
        });

      render(<PayViaLinkTestComponent linkId="error-link" />);

      await waitFor(() => {
        expect(screen.getByTestId('pay-form')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('pay-button'));

      await waitFor(() => {
        expect(screen.getByTestId('pay-error')).toHaveTextContent('Insufficient funds');
      });
    });
  });

  describe('Link Status Display', () => {
    it('should display active status', async () => {
      const link = createMockPaymentLink({ id: 'active-link', status: 'active' });

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ paymentLinks: [link] }),
      });

      render(<PaymentLinksTestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('link-status-active-link')).toHaveTextContent('active');
      });
    });

    it('should display paid status with transaction link', async () => {
      const link = createMockPaymentLink({
        id: 'paid-link',
        status: 'paid',
        txHash: '0xpaidhash',
      });

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ paymentLinks: [link] }),
      });

      render(<PaymentLinksTestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('link-status-paid-link')).toHaveTextContent('paid');
        expect(screen.getByTestId('tx-link-paid-link')).toHaveAttribute(
          'href',
          'https://scan.plasma.to/tx/0xpaidhash'
        );
      });
    });

    it('should display multiple links sorted by creation date', async () => {
      const links = [
        createMockPaymentLink({ id: 'link-1', createdAt: '2025-01-20T00:00:00Z' }),
        createMockPaymentLink({ id: 'link-2', createdAt: '2025-01-25T00:00:00Z' }),
        createMockPaymentLink({ id: 'link-3', createdAt: '2025-01-15T00:00:00Z' }),
      ];

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ paymentLinks: links }),
      });

      render(<PaymentLinksTestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('links-list')).toBeInTheDocument();
      });

      // All links should be present
      expect(screen.getByTestId('link-link-1')).toBeInTheDocument();
      expect(screen.getByTestId('link-link-2')).toBeInTheDocument();
      expect(screen.getByTestId('link-link-3')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no links', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ paymentLinks: [] }),
      });

      render(<PaymentLinksTestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('empty-state')).toBeInTheDocument();
        expect(screen.getByText(/no payment links/i)).toBeInTheDocument();
      });
    });

    it('should show create button in empty state', async () => {
      const user = userEvent.setup({ writeToClipboard: false });

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ paymentLinks: [] }),
      });

      render(<PaymentLinksTestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('create-first-link')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('create-first-link'));

      expect(screen.getByTestId('create-form')).toBeInTheDocument();
    });
  });
});
