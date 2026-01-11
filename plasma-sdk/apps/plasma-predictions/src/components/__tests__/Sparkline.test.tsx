import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { Sparkline } from '../Sparkline'
import type { PriceSnapshot } from '@/lib/price-history'

describe('Sparkline Component', () => {
  const mockData: PriceSnapshot[] = [
    { price: 0.50, timestamp: Date.now() - 3600000 },
    { price: 0.55, timestamp: Date.now() - 2700000 },
    { price: 0.60, timestamp: Date.now() - 1800000 },
    { price: 0.58, timestamp: Date.now() - 900000 },
    { price: 0.65, timestamp: Date.now() },
  ]

  const downTrendData: PriceSnapshot[] = [
    { price: 0.80, timestamp: Date.now() - 3600000 },
    { price: 0.75, timestamp: Date.now() - 2700000 },
    { price: 0.70, timestamp: Date.now() - 1800000 },
    { price: 0.68, timestamp: Date.now() - 900000 },
    { price: 0.60, timestamp: Date.now() },
  ]

  it('should render SVG element', () => {
    render(<Sparkline data={mockData} />)
    const svg = screen.getByTestId('sparkline-svg')
    expect(svg).toBeInTheDocument()
    expect(svg.tagName).toBe('svg')
  })

  it('should render path element for the line', () => {
    render(<Sparkline data={mockData} />)
    const path = screen.getByTestId('sparkline-path')
    expect(path).toBeInTheDocument()
    expect(path.tagName).toBe('path')
  })

  it('should render green line for upward trend', () => {
    render(<Sparkline data={mockData} />)
    const path = screen.getByTestId('sparkline-path')
    // Should have green stroke for positive trend
    expect(path).toHaveClass('stroke-yes')
  })

  it('should render red line for downward trend', () => {
    render(<Sparkline data={downTrendData} />)
    const path = screen.getByTestId('sparkline-path')
    // Should have red stroke for negative trend
    expect(path).toHaveClass('stroke-no')
  })

  it('should respect custom width and height', () => {
    render(<Sparkline data={mockData} width={100} height={40} />)
    const svg = screen.getByTestId('sparkline-svg')
    expect(svg).toHaveAttribute('width', '100')
    expect(svg).toHaveAttribute('height', '40')
  })

  it('should handle empty data gracefully', () => {
    render(<Sparkline data={[]} />)
    const svg = screen.getByTestId('sparkline-svg')
    expect(svg).toBeInTheDocument()
    // Should render placeholder or empty state
  })

  it('should handle single data point', () => {
    render(<Sparkline data={[{ price: 0.65, timestamp: Date.now() }]} />)
    const svg = screen.getByTestId('sparkline-svg')
    expect(svg).toBeInTheDocument()
  })

  it('should have accessible role', () => {
    render(<Sparkline data={mockData} />)
    const svg = screen.getByRole('img')
    expect(svg).toBeInTheDocument()
  })
})
