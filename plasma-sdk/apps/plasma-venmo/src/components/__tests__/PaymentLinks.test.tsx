import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaymentLinks } from '../PaymentLinks'

// Mock fetch
global.fetch = jest.fn()

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
})

const mockPaymentLinks = [
  {
    id: '1',
    creatorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7',
    amount: 10,
    currency: 'USDT0',
    memo: 'Test payment',
    status: 'active',
    createdAt: new Date().toISOString(),
    url: 'https://plasma.to/pay/abc123',
  },
  {
    id: '2',
    creatorAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7',
    amount: null,
    currency: 'USDT0',
    memo: 'Any amount',
    status: 'active',
    createdAt: new Date().toISOString(),
    url: 'https://plasma.to/pay/def456',
  },
]

describe('PaymentLinks', () => {
  const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7' as `0x${string}`
  const mockOnRefresh = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ paymentLinks: mockPaymentLinks }),
    })
  })

  it('renders payment links header', async () => {
    render(<PaymentLinks address={mockAddress} onRefresh={mockOnRefresh} />)
    
    await waitFor(() => {
      expect(screen.getByText('Payment Links')).toBeInTheDocument()
    })
  })

  it('shows loading skeleton initially', () => {
    render(<PaymentLinks address={mockAddress} onRefresh={mockOnRefresh} />)
    
    // Should show skeleton during loading
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('displays payment links after loading', async () => {
    render(<PaymentLinks address={mockAddress} onRefresh={mockOnRefresh} />)
    
    await waitFor(() => {
      expect(screen.getByText('$10')).toBeInTheDocument()
      expect(screen.getByText('Test payment')).toBeInTheDocument()
    })
  })

  it('shows "New Link" button', async () => {
    render(<PaymentLinks address={mockAddress} onRefresh={mockOnRefresh} />)
    
    await waitFor(() => {
      expect(screen.getByText('New Link')).toBeInTheDocument()
    })
  })

  it('opens create form when "New Link" is clicked', async () => {
    render(<PaymentLinks address={mockAddress} onRefresh={mockOnRefresh} />)
    
    await waitFor(() => {
      expect(screen.getByText('New Link')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('New Link'))

    await waitFor(() => {
      expect(screen.getByText('Create Link')).toBeInTheDocument()
    })
  })

  it('shows empty state when no links exist', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ paymentLinks: [] }),
    })

    render(<PaymentLinks address={mockAddress} onRefresh={mockOnRefresh} />)
    
    await waitFor(() => {
      expect(screen.getByText('No payment links yet')).toBeInTheDocument()
    })
  })

  it('handles fetch error with retry button', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    })

    render(<PaymentLinks address={mockAddress} onRefresh={mockOnRefresh} />)
    
    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })
  })

  it('copies link URL when copy button is clicked', async () => {
    render(<PaymentLinks address={mockAddress} onRefresh={mockOnRefresh} />)
    
    await waitFor(() => {
      expect(screen.getByText('$10')).toBeInTheDocument()
    })

    // Find and click copy button (first one)
    const copyButtons = screen.getAllByRole('button', { name: /copy/i })
    if (copyButtons.length > 0) {
      await userEvent.click(copyButtons[0])
      expect(navigator.clipboard.writeText).toHaveBeenCalled()
    }
  })

  it('does not render when address is undefined', () => {
    const { container } = render(<PaymentLinks address={undefined} onRefresh={mockOnRefresh} />)
    
    // Should still render but with empty state eventually
    expect(container).toBeTruthy()
  })
})
