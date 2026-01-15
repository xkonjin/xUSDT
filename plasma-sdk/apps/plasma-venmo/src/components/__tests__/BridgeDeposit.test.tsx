/**
 * BridgeDeposit Component Tests
 * 
 * Uses the mock at src/__mocks__/aggregator.ts to avoid ESM transformation issues.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock Privy hooks
jest.mock('@plasma-pay/privy-auth', () => ({
  useAllWallets: jest.fn(() => ({
    wallets: [],
    embeddedWallet: null,
    externalWallets: [],
    hasExternalWallet: false,
  })),
  useConnectExternalWallet: jest.fn(() => ({
    connectWallet: jest.fn(),
    loading: false,
    error: null,
  })),
}));

// Mock posthog
jest.mock('@/lib/posthog', () => ({
  posthog: { capture: jest.fn() },
}));

// Mock ModalPortal to simplify rendering
jest.mock('../ui/ModalPortal', () => ({
  ModalPortal: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) =>
    isOpen ? <div data-testid="modal">{children}</div> : null,
}));

// Mock fetch
global.fetch = jest.fn();

// Import AFTER mocks
import { BridgeDepositButton, BridgeDepositModal } from '../BridgeDeposit';

describe('BridgeDepositButton', () => {
  const recipientAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders button with correct content', () => {
    render(<BridgeDepositButton recipientAddress={recipientAddress} />);
    
    expect(screen.getByText('Bridge Any Token')).toBeInTheDocument();
    expect(screen.getByText('NEW')).toBeInTheDocument();
  });

  it('has accessible label', () => {
    render(<BridgeDepositButton recipientAddress={recipientAddress} />);
    
    expect(screen.getByRole('button', { name: /bridge any token/i })).toBeInTheDocument();
  });

  it('opens modal on click', async () => {
    const user = userEvent.setup();
    render(<BridgeDepositButton recipientAddress={recipientAddress} />);
    
    await user.click(screen.getByRole('button'));
    
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });
});

describe('BridgeDepositModal', () => {
  const recipientAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7';
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  it('renders modal with title', () => {
    render(<BridgeDepositModal recipientAddress={recipientAddress} onClose={mockOnClose} />);
    
    expect(screen.getByText('Bridge to USDT0')).toBeInTheDocument();
  });

  it('has dialog role with aria attributes', () => {
    render(<BridgeDepositModal recipientAddress={recipientAddress} onClose={mockOnClose} />);
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('shows default chain (ETH)', () => {
    render(<BridgeDepositModal recipientAddress={recipientAddress} onClose={mockOnClose} />);
    
    expect(screen.getByText('ETH')).toBeInTheDocument();
  });

  it('shows placeholder when no amount', () => {
    render(<BridgeDepositModal recipientAddress={recipientAddress} onClose={mockOnClose} />);
    
    expect(screen.getByText('Enter amount above')).toBeInTheDocument();
  });

  it('calls onClose when X clicked', async () => {
    const user = userEvent.setup();
    render(<BridgeDepositModal recipientAddress={recipientAddress} onClose={mockOnClose} />);
    
    await user.click(screen.getByRole('button', { name: /close/i }));
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows connect wallet button when no wallet', () => {
    render(<BridgeDepositModal recipientAddress={recipientAddress} onClose={mockOnClose} />);
    
    expect(screen.getByText(/connect wallet/i)).toBeInTheDocument();
  });

  it('shows loading when fetching quote', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
    
    render(<BridgeDepositModal recipientAddress={recipientAddress} onClose={mockOnClose} />);
    
    const input = screen.getByRole('spinbutton');
    await user.type(input, '1');
    
    await waitFor(() => {
      expect(screen.getByText(/finding best price/i)).toBeInTheDocument();
    });
  });

  it('shows quote result on success', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        best: {
          provider: 'lifi',
          toAmount: '1000000', // 1 USDT
          toAmountMin: '990000',
          gasUsd: '2.50',
          estimatedTime: 60,
        },
        all: [],
        errors: [],
      }),
    });
    
    render(<BridgeDepositModal recipientAddress={recipientAddress} onClose={mockOnClose} />);
    
    const input = screen.getByRole('spinbutton');
    await user.type(input, '1');
    
    await waitFor(() => {
      expect(screen.getByText('$1.00')).toBeInTheDocument();
    });
  });

  it('shows error on quote failure', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'No routes found' }),
    });
    
    render(<BridgeDepositModal recipientAddress={recipientAddress} onClose={mockOnClose} />);
    
    const input = screen.getByRole('spinbutton');
    await user.type(input, '1');
    
    await waitFor(() => {
      expect(screen.getByText('No routes found')).toBeInTheDocument();
    });
  });

  it('renders provider info in footer', () => {
    render(<BridgeDepositModal recipientAddress={recipientAddress} onClose={mockOnClose} />);
    
    expect(screen.getByText(/LI.FI, deBridge, Squid & Across/)).toBeInTheDocument();
  });
});

describe('BridgeDepositModal with connected wallet', () => {
  const recipientAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock connected wallet
    const privyAuth = require('@plasma-pay/privy-auth');
    privyAuth.useAllWallets.mockReturnValue({
      wallets: [{
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7',
        walletClientType: 'metamask',
        getEthereumProvider: jest.fn().mockResolvedValue({ request: jest.fn() }),
      }],
      embeddedWallet: null,
      externalWallets: [{
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7',
        walletClientType: 'metamask',
        getEthereumProvider: jest.fn().mockResolvedValue({ request: jest.fn() }),
      }],
      hasExternalWallet: true,
    });
  });

  it('shows connected wallet indicator', () => {
    render(<BridgeDepositModal recipientAddress={recipientAddress} onClose={jest.fn()} />);
    
    expect(screen.getByText(/Connected:/)).toBeInTheDocument();
  });
});
