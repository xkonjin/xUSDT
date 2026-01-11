import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { LivePriceIndicator, ConnectionStatusBadge, PriceChangeAnimation } from '../LivePriceIndicator'
import type { ConnectionStatus, PriceUpdate } from '@/lib/price-updater'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>{children}</div>
    ),
    span: ({ children, className, ...props }: any) => (
      <span className={className} {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe('LivePriceIndicator', () => {
  it('should render nothing when not live', () => {
    const { container } = render(<LivePriceIndicator isLive={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('should render live indicator when isLive is true', () => {
    render(<LivePriceIndicator isLive={true} />)
    expect(screen.getByText(/live/i)).toBeInTheDocument()
  })

  it('should have pulsing animation class', () => {
    render(<LivePriceIndicator isLive={true} />)
    const indicator = screen.getByTestId('live-indicator')
    expect(indicator).toHaveClass('animate-pulse')
  })

  it('should accept custom className', () => {
    render(<LivePriceIndicator isLive={true} className="custom-class" />)
    const indicator = screen.getByTestId('live-indicator')
    expect(indicator).toHaveClass('custom-class')
  })
})

describe('ConnectionStatusBadge', () => {
  it('should show "Live" badge when connected', () => {
    render(<ConnectionStatusBadge status="connected" />)
    expect(screen.getByText('Live')).toBeInTheDocument()
    expect(screen.getByTestId('connection-badge')).toHaveClass('bg-green-500')
  })

  it('should show "Connecting" badge when connecting', () => {
    render(<ConnectionStatusBadge status="connecting" />)
    expect(screen.getByText('Connecting...')).toBeInTheDocument()
    expect(screen.getByTestId('connection-badge')).toHaveClass('bg-yellow-500')
  })

  it('should show "Reconnecting" badge on error', () => {
    render(<ConnectionStatusBadge status="error" />)
    expect(screen.getByText('Reconnecting...')).toBeInTheDocument()
    expect(screen.getByTestId('connection-badge')).toHaveClass('bg-red-500')
  })

  it('should show "Offline" badge when disconnected', () => {
    render(<ConnectionStatusBadge status="disconnected" />)
    expect(screen.getByText('Offline')).toBeInTheDocument()
    expect(screen.getByTestId('connection-badge')).toHaveClass('bg-gray-500')
  })

  it('should show pulsing dot when connected', () => {
    render(<ConnectionStatusBadge status="connected" />)
    const dot = screen.getByTestId('status-dot')
    expect(dot).toHaveClass('animate-pulse')
  })
})

describe('PriceChangeAnimation', () => {
  it('should render children', () => {
    render(
      <PriceChangeAnimation priceChange="none">
        <span>65%</span>
      </PriceChangeAnimation>
    )
    expect(screen.getByText('65%')).toBeInTheDocument()
  })

  it('should have green flash animation on price up', () => {
    render(
      <PriceChangeAnimation priceChange="up">
        <span>65%</span>
      </PriceChangeAnimation>
    )
    const wrapper = screen.getByTestId('price-animation')
    expect(wrapper).toHaveClass('price-up')
  })

  it('should have red flash animation on price down', () => {
    render(
      <PriceChangeAnimation priceChange="down">
        <span>65%</span>
      </PriceChangeAnimation>
    )
    const wrapper = screen.getByTestId('price-animation')
    expect(wrapper).toHaveClass('price-down')
  })

  it('should have no animation class when price unchanged', () => {
    render(
      <PriceChangeAnimation priceChange="none">
        <span>65%</span>
      </PriceChangeAnimation>
    )
    const wrapper = screen.getByTestId('price-animation')
    expect(wrapper).not.toHaveClass('price-up')
    expect(wrapper).not.toHaveClass('price-down')
  })

  it('should support custom trigger for animation reset', () => {
    const { rerender } = render(
      <PriceChangeAnimation priceChange="up" animationKey="1">
        <span>65%</span>
      </PriceChangeAnimation>
    )
    
    rerender(
      <PriceChangeAnimation priceChange="down" animationKey="2">
        <span>60%</span>
      </PriceChangeAnimation>
    )
    
    const wrapper = screen.getByTestId('price-animation')
    expect(wrapper).toHaveClass('price-down')
  })
})
