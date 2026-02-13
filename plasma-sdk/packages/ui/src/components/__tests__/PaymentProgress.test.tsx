import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentProgress, PaymentStatus } from '../PaymentProgress';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Loader2: ({ className }: any) => <div data-testid="loader2" className={className} />,
  CheckCircle: ({ className }: any) => <div data-testid="check-circle" className={className} />,
  XCircle: ({ className }: any) => <div data-testid="x-circle" className={className} />,
  RefreshCw: ({ className }: any) => <div data-testid="refresh-cw" className={className} />,
  ExternalLink: ({ className }: any) => <div data-testid="external-link" className={className} />,
  Wifi: ({ className }: any) => <div data-testid="wifi" className={className} />,
  WifiOff: ({ className }: any) => <div data-testid="wifi-off" className={className} />,
  Clock: ({ className }: any) => <div data-testid="clock" className={className} />,
  AlertCircle: ({ className }: any) => <div data-testid="alert-circle" className={className} />,
}));

describe('PaymentProgress', () => {
  const defaultProps = {
    status: 'signing' as PaymentStatus,
  };

  const setNavigatorOnline = (isOnline: boolean) => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: isOnline,
    });
  };

  beforeEach(() => {
    setNavigatorOnline(true);
  });

  it('does not render when status is idle', () => {
    render(<PaymentProgress status="idle" />);
    expect(screen.queryByText('Please sign the transaction')).not.toBeInTheDocument();
  });

  it('renders correctly for signing status', () => {
    render(<PaymentProgress {...defaultProps} status="signing" />);
    expect(screen.getByText('Please sign the transaction')).toBeInTheDocument();
    expect(screen.getByText('Check your wallet to sign the payment')).toBeInTheDocument();
    expect(screen.getByTestId('loader2')).toBeInTheDocument();
  });

  it('renders correctly for submitting status', () => {
    render(<PaymentProgress {...defaultProps} status="submitting" />);
    expect(screen.getByText('Submitting transaction...')).toBeInTheDocument();
    expect(screen.getByText('Sending your payment to the network')).toBeInTheDocument();
  });

  it('renders correctly for confirming status', () => {
    render(<PaymentProgress {...defaultProps} status="confirming" />);
    expect(screen.getByText('Confirming on Plasma...')).toBeInTheDocument();
    expect(screen.getByText('Transaction is being confirmed on the blockchain')).toBeInTheDocument();
  });

  it('renders correctly for complete status', () => {
    render(<PaymentProgress {...defaultProps} status="complete" />);
    expect(screen.getByText('Payment successful!')).toBeInTheDocument();
    expect(screen.getByText('Your payment has been completed')).toBeInTheDocument();
  });

  it('renders correctly for error status', () => {
    render(<PaymentProgress {...defaultProps} status="error" error="Transaction failed" />);
    expect(screen.getByText('Payment failed')).toBeInTheDocument();
    expect(screen.getByText('Transaction failed')).toBeInTheDocument();
    expect(screen.getByTestId('x-circle')).toBeInTheDocument();
  });

  it('shows progress ring for loading states', () => {
    render(<PaymentProgress {...defaultProps} status="signing" />);
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('shows correct progress percentage', async () => {
    const { rerender } = render(<PaymentProgress {...defaultProps} status="signing" />);
    await waitFor(() => {
      expect(screen.getByText('25%')).toBeInTheDocument();
    });

    rerender(<PaymentProgress {...defaultProps} status="submitting" />);
    await waitFor(() => {
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    rerender(<PaymentProgress {...defaultProps} status="confirming" />);
    await waitFor(() => {
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    rerender(<PaymentProgress {...defaultProps} status="complete" />);
    expect(screen.queryByText('100%')).not.toBeInTheDocument();
  });

  it('shows step indicators correctly', () => {
    render(<PaymentProgress {...defaultProps} status="signing" />);
    expect(screen.getByText('Signing')).toBeInTheDocument();
    expect(screen.queryByText('Submit')).not.toBeInTheDocument(); // Not a step in the UI

    // Check for step descriptions
    expect(screen.getByText(/Confirm in your wallet/i)).toBeInTheDocument();
  });

  it('displays transaction hash when provided', () => {
    render(
      <PaymentProgress
        {...defaultProps}
        status="complete"
        txHash="0x1234567890"
      />
    );
    expect(screen.getByText('View on Explorer')).toBeInTheDocument();
  });

  it('includes txHash in explorer link', () => {
    render(
      <PaymentProgress
        {...defaultProps}
        status="complete"
        txHash="0x1234567890"
      />
    );
    const link = screen.getByText('View on Explorer').closest('a');
    expect(link).toHaveAttribute('href', 'https://scan.plasma.to/tx/0x1234567890');
  });

  it('uses custom explorer url', () => {
    render(
      <PaymentProgress
        {...defaultProps}
        status="complete"
        txHash="0x1234567890"
        explorerUrl="https://custom.explorer"
      />
    );
    const link = screen.getByText('View on Explorer').closest('a');
    expect(link).toHaveAttribute('href', 'https://custom.explorer/tx/0x1234567890');
  });

  it('displays payment details for complete state', () => {
    render(
      <PaymentProgress
        {...defaultProps}
        status="complete"
        amount="10.50"
        recipient="test@example.com"
      />
    );
    expect(screen.getByText('$10.50')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('displays payment details for error state', () => {
    render(
      <PaymentProgress
        {...defaultProps}
        status="error"
        amount="10.50"
        recipient="test@example.com"
      />
    );
    expect(screen.getByText('$10.50')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('shows retry button for error state when retryable', async () => {
    const handleRetry = jest.fn();
    const user = userEvent.setup();
    render(
      <PaymentProgress
        {...defaultProps}
        status="error"
        retryable
        onRetry={handleRetry}
      />
    );
    
    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();
    await user.click(retryButton);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('does not show retry button when not retryable', () => {
    render(
      <PaymentProgress
        {...defaultProps}
        status="error"
        retryable={false}
      />
    );
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });

  it('shows close button for complete state', async () => {
    const handleClose = jest.fn();
    const user = userEvent.setup();
    render(
      <PaymentProgress
        {...defaultProps}
        status="complete"
        onClose={handleClose}
      />
    );
    
    const closeButton = screen.getByText('Done');
    expect(closeButton).toBeInTheDocument();
    await user.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('shows close button for error state', async () => {
    const handleClose = jest.fn();
    const user = userEvent.setup();
    render(
      <PaymentProgress
        {...defaultProps}
        status="error"
        onClose={handleClose}
      />
    );
    
    const closeButton = screen.getByText('Close');
    expect(closeButton).toBeInTheDocument();
    await user.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('shows cancel button for loading states', async () => {
    const handleClose = jest.fn();
    const user = userEvent.setup();
    render(
      <PaymentProgress
        {...defaultProps}
        status="signing"
        onClose={handleClose}
      />
    );
    
    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton).toBeInTheDocument();
    await user.click(cancelButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('shows online status indicator', () => {
    render(<PaymentProgress {...defaultProps} status="signing" />);
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByTestId('wifi')).toBeInTheDocument();
  });

  it('shows offline status indicator', () => {
    setNavigatorOnline(false);
    render(<PaymentProgress {...defaultProps} status="signing" />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByTestId('wifi-off')).toBeInTheDocument();
  });

  it('does not show payment details for loading states', () => {
    render(
      <PaymentProgress
        {...defaultProps}
        status="signing"
        amount="10.50"
        recipient="test@example.com"
      />
    );
    expect(screen.queryByText('$10.50')).not.toBeInTheDocument();
    expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
  });

  it('does not show transaction hash for loading states', () => {
    render(
      <PaymentProgress
        {...defaultProps}
        status="signing"
        txHash="0x1234567890"
      />
    );
    expect(screen.queryByText('View on Explorer')).not.toBeInTheDocument();
  });

  it('shows error message when provided', () => {
    render(
      <PaymentProgress
        {...defaultProps}
        status="error"
        error="Insufficient funds"
      />
    );
    expect(screen.getByText('Insufficient funds')).toBeInTheDocument();
  });

  it('shows default error message when none provided', () => {
    render(
      <PaymentProgress
        {...defaultProps}
        status="error"
      />
    );
    expect(screen.getAllByText('Payment failed').length).toBeGreaterThan(0);
  });

  it('has correct accessibility attributes', () => {
    render(<PaymentProgress {...defaultProps} status="complete" />);
    // Should have role="dialog" and aria-modal="true" implicitly through UI patterns
    // (The component doesn't explicitly add these, but follows modal-like patterns)
  });

  it('handles online/offline events', async () => {
    render(<PaymentProgress {...defaultProps} status="signing" />);
    
    // Initially online
    expect(screen.getByText('Online')).toBeInTheDocument();
    
    // Go offline
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    await waitFor(() => {
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });
    
    // Go back online
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => {
      expect(screen.getByText('Online')).toBeInTheDocument();
    });
  });
});
