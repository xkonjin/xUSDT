import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PriceChart } from '../PriceChart'
import type { PriceSnapshot } from '@/lib/price-history'

// Generate mock data for different time ranges
const generateMockData = (hours: number): PriceSnapshot[] => {
  const data: PriceSnapshot[] = []
  const now = Date.now()
  const interval = (hours * 60 * 60 * 1000) / 24 // 24 data points

  for (let i = 0; i < 24; i++) {
    data.push({
      price: 0.5 + Math.random() * 0.3,
      timestamp: now - (24 - i) * interval,
    })
  }
  return data
}

describe('PriceChart Component', () => {
  const mockData = generateMockData(24)

  const mockGetHistoryForRange = jest.fn(() => {
    return mockData
  })

  beforeEach(() => {
    mockGetHistoryForRange.mockClear()
  })

  it('should render SVG chart', () => {
    render(
      <PriceChart 
        marketId="market-1" 
        getHistoryForRange={mockGetHistoryForRange}
      />
    )
    const svg = screen.getByTestId('price-chart-svg')
    expect(svg).toBeInTheDocument()
    expect(svg.tagName).toBe('svg')
  })

  it('should render time range selector with all options', () => {
    render(
      <PriceChart 
        marketId="market-1" 
        getHistoryForRange={mockGetHistoryForRange}
      />
    )
    
    expect(screen.getByRole('button', { name: /1h/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /24h/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /7d/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /30d/i })).toBeInTheDocument()
  })

  it('should default to 24h time range', () => {
    render(
      <PriceChart 
        marketId="market-1" 
        getHistoryForRange={mockGetHistoryForRange}
      />
    )
    
    const button24h = screen.getByRole('button', { name: /24h/i })
    expect(button24h).toHaveClass('bg-white/10') // Active state
  })

  it('should change time range on button click', async () => {
    const user = userEvent.setup()
    
    render(
      <PriceChart 
        marketId="market-1" 
        getHistoryForRange={mockGetHistoryForRange}
      />
    )
    
    const button7d = screen.getByRole('button', { name: /7d/i })
    await user.click(button7d)
    
    expect(button7d).toHaveClass('bg-white/10')
    expect(mockGetHistoryForRange).toHaveBeenCalledWith('market-1', '7d')
  })

  it('should display current price', () => {
    render(
      <PriceChart 
        marketId="market-1" 
        currentPrice={0.65}
        getHistoryForRange={mockGetHistoryForRange}
      />
    )
    
    expect(screen.getByText('65%')).toBeInTheDocument()
  })

  it('should display price change percentage', () => {
    render(
      <PriceChart 
        marketId="market-1" 
        currentPrice={0.65}
        priceChange={{ absolute: 0.05, percent: 8.3, isPositive: true }}
        getHistoryForRange={mockGetHistoryForRange}
      />
    )
    
    expect(screen.getByText(/\+8\.3%/)).toBeInTheDocument()
  })

  it('should show tooltip on hover', async () => {
    const user = userEvent.setup()
    
    render(
      <PriceChart 
        marketId="market-1" 
        getHistoryForRange={mockGetHistoryForRange}
      />
    )
    
    const chartArea = screen.getByTestId('price-chart-hover-area')
    await user.hover(chartArea)
    
    await waitFor(() => {
      const tooltip = screen.getByTestId('price-chart-tooltip')
      expect(tooltip).toBeInTheDocument()
    })
  })

  it('should hide tooltip on mouse leave', async () => {
    const user = userEvent.setup()
    
    render(
      <PriceChart 
        marketId="market-1" 
        getHistoryForRange={mockGetHistoryForRange}
      />
    )
    
    const chartArea = screen.getByTestId('price-chart-hover-area')
    await user.hover(chartArea)
    await user.unhover(chartArea)
    
    await waitFor(() => {
      const tooltip = screen.queryByTestId('price-chart-tooltip')
      expect(tooltip).not.toBeInTheDocument()
    })
  })

  it('should render gradient fill under the line', () => {
    render(
      <PriceChart 
        marketId="market-1" 
        getHistoryForRange={mockGetHistoryForRange}
      />
    )
    
    const gradient = screen.getByTestId('price-chart-gradient')
    expect(gradient).toBeInTheDocument()
  })

  it('should handle empty data gracefully', () => {
    const emptyDataFn = jest.fn(() => [])
    
    render(
      <PriceChart 
        marketId="market-1" 
        getHistoryForRange={emptyDataFn}
      />
    )
    
    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })

  it('should display min and max price labels', () => {
    render(
      <PriceChart 
        marketId="market-1" 
        getHistoryForRange={mockGetHistoryForRange}
      />
    )
    
    // Should show Y-axis labels or min/max indicators
    expect(screen.getByTestId('price-chart-y-axis')).toBeInTheDocument()
  })

  it('should display time labels on X-axis', () => {
    render(
      <PriceChart 
        marketId="market-1" 
        getHistoryForRange={mockGetHistoryForRange}
      />
    )
    
    expect(screen.getByTestId('price-chart-x-axis')).toBeInTheDocument()
  })
})
