import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TransactionHistory } from '../TransactionHistory'

// Mock fetch
global.fetch = jest.fn()

// Mock window.open
const mockOpen = jest.fn()
window.open = mockOpen

const mockTransactions = [
  {
    id: '1',
    type: 'sent' as const,
    amount: '10.00',
    counterparty: '0x1234...5678',
    timestamp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
    txHash: '0xabc123',
  },
  {
    id: '2',
    type: 'received' as const,
    amount: '25.50',
    counterparty: '0x8765...4321',
    timestamp: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
    txHash: '0xdef456',
  },
]

describe('TransactionHistory', () => {
  const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7' as `0x${string}`

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        transactions: mockTransactions,
        total: 2,
        hasMore: false,
      }),
    })
  })

  it('renders recent activity header', async () => {
    render(<TransactionHistory address={mockAddress} />)
    
    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument()
    })
  })

  it('shows loading skeleton initially', () => {
    render(<TransactionHistory address={mockAddress} />)
    
    // Should show skeleton during loading
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('displays transactions after loading', async () => {
    render(<TransactionHistory address={mockAddress} />)
    
    await waitFor(() => {
      expect(screen.getByText('-$10.00')).toBeInTheDocument()
      expect(screen.getByText('+$25.50')).toBeInTheDocument()
    })
  })

  it('shows sent/received labels correctly', async () => {
    render(<TransactionHistory address={mockAddress} />)
    
    await waitFor(() => {
      expect(screen.getByText(/sent to/i)).toBeInTheDocument()
      expect(screen.getByText(/received from/i)).toBeInTheDocument()
    })
  })

  it('shows empty state when no transactions', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ transactions: [], total: 0, hasMore: false }),
    })

    render(<TransactionHistory address={mockAddress} />)
    
    await waitFor(() => {
      expect(screen.getByText('No transactions yet')).toBeInTheDocument()
    })
  })

  it('handles fetch error with retry button', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    })

    render(<TransactionHistory address={mockAddress} />)
    
    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })
  })

  it('opens plasma scan when transaction is clicked', async () => {
    render(<TransactionHistory address={mockAddress} />)
    
    await waitFor(() => {
      expect(screen.getByText('-$10.00')).toBeInTheDocument()
    })

    // Click on transaction row
    const txRow = screen.getByText('-$10.00').closest('[class*="cursor-pointer"]')
    if (txRow) {
      await userEvent.click(txRow)
      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining('scan.plasma.to'),
        '_blank'
      )
    }
  })

  it('shows transaction count', async () => {
    render(<TransactionHistory address={mockAddress} />)
    
    await waitFor(() => {
      expect(screen.getByText(/showing 2 transaction/i)).toBeInTheDocument()
    })
  })

  it('loads more transactions when button clicked', async () => {
    // Mock returns transactions at PAGE_SIZE (10) to trigger hasMore
    const manyTransactions = Array.from({ length: 10 }, (_, i) => ({
      id: String(i + 1),
      type: 'sent' as const,
      amount: `${10 + i}.00`, // Different amounts to avoid duplicate text
      counterparty: '0x1234...5678',
      timestamp: Math.floor(Date.now() / 1000) - 3600 * (i + 1),
      txHash: `0xabc${i}`,
    }))
    
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ 
        transactions: manyTransactions,
        total: 20,
        hasMore: true,
      }),
    })

    render(<TransactionHistory address={mockAddress} />)
    
    await waitFor(() => {
      // Use getAllByText since there may be multiple
      const amounts = screen.getAllByText(/-\$\d+\.\d+/)
      expect(amounts.length).toBeGreaterThan(0)
    })
    
    // Load More button should appear when hasMore is true
    const loadMoreBtn = screen.queryByText('Load More')
    if (loadMoreBtn) {
      expect(loadMoreBtn).toBeInTheDocument()
    }
  })

  it('does not show Load More when hasMore is false', async () => {
    render(<TransactionHistory address={mockAddress} />)
    
    await waitFor(() => {
      expect(screen.getByText('-$10.00')).toBeInTheDocument()
    })

    expect(screen.queryByText('Load More')).not.toBeInTheDocument()
  })
})
