import { renderHook, act, waitFor } from '@testing-library/react'
import React, { type ReactNode } from 'react'
import { usePriceUpdates, usePriceConnection } from '../usePriceUpdates'
import { PriceUpdaterProvider, usePriceUpdaterContext } from '@/lib/price-updater-context'

// Mock the price updater module
const mockSubscribe = jest.fn(() => jest.fn())
const mockStart = jest.fn()
const mockStop = jest.fn()
const mockOnConnectionChange = jest.fn(() => jest.fn())
const mockGetConnectionStatus = jest.fn(() => 'disconnected')

jest.mock('@/lib/price-updater', () => ({
  PriceUpdater: jest.fn().mockImplementation(() => ({
    subscribe: mockSubscribe,
    start: mockStart,
    stop: mockStop,
    onConnectionChange: mockOnConnectionChange,
    getConnectionStatus: mockGetConnectionStatus,
    destroy: jest.fn(),
    getSubscribedMarkets: jest.fn(() => []),
  })),
}))

const Wrapper = ({ children }: { children: ReactNode }) => (
  <PriceUpdaterProvider>{children}</PriceUpdaterProvider>
)

describe('usePriceUpdates', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSubscribe.mockReturnValue(jest.fn())
    mockOnConnectionChange.mockReturnValue(jest.fn())
    mockGetConnectionStatus.mockReturnValue('disconnected')
  })

  describe('Subscription', () => {
    it('should subscribe to price updates for a market', () => {
      renderHook(() => usePriceUpdates('test-market-1'), { wrapper: Wrapper })
      
      expect(mockSubscribe).toHaveBeenCalledWith('test-market-1', expect.any(Function))
    })

    it('should not subscribe when marketId is undefined', () => {
      renderHook(() => usePriceUpdates(undefined), { wrapper: Wrapper })
      
      expect(mockSubscribe).not.toHaveBeenCalled()
    })

    it('should unsubscribe on unmount', () => {
      const unsubscribe = jest.fn()
      mockSubscribe.mockReturnValue(unsubscribe)
      
      const { unmount } = renderHook(() => usePriceUpdates('test-market-1'), { wrapper: Wrapper })
      unmount()
      
      expect(unsubscribe).toHaveBeenCalled()
    })

    it('should resubscribe when marketId changes', () => {
      const unsubscribe = jest.fn()
      mockSubscribe.mockReturnValue(unsubscribe)
      
      const { rerender } = renderHook(
        ({ marketId }) => usePriceUpdates(marketId),
        { wrapper: Wrapper, initialProps: { marketId: 'market-1' } }
      )
      
      expect(mockSubscribe).toHaveBeenCalledWith('market-1', expect.any(Function))
      
      rerender({ marketId: 'market-2' })
      
      expect(unsubscribe).toHaveBeenCalled()
      expect(mockSubscribe).toHaveBeenCalledWith('market-2', expect.any(Function))
    })
  })

  describe('State Updates', () => {
    it('should return null initially for price data', () => {
      const { result } = renderHook(() => usePriceUpdates('test-market-1'), { wrapper: Wrapper })
      
      expect(result.current.priceUpdate).toBeNull()
      expect(result.current.isLive).toBe(false)
    })

    it('should update state when price update is received', async () => {
      let priceListener: Function = () => {}
      mockSubscribe.mockImplementation((_marketId, listener) => {
        priceListener = listener
        return jest.fn()
      })
      
      const { result } = renderHook(() => usePriceUpdates('test-market-1'), { wrapper: Wrapper })
      
      act(() => {
        priceListener({
          marketId: 'test-market-1',
          yesPrice: 0.65,
          noPrice: 0.35,
          timestamp: Date.now(),
          priceChange: 'up',
        })
      })
      
      expect(result.current.priceUpdate).toEqual(expect.objectContaining({
        marketId: 'test-market-1',
        yesPrice: 0.65,
        noPrice: 0.35,
        priceChange: 'up',
      }))
      expect(result.current.isLive).toBe(true)
    })

    it('should track price change direction', async () => {
      let priceListener: Function = () => {}
      mockSubscribe.mockImplementation((_marketId, listener) => {
        priceListener = listener
        return jest.fn()
      })
      
      const { result } = renderHook(() => usePriceUpdates('test-market-1'), { wrapper: Wrapper })
      
      // First update
      act(() => {
        priceListener({
          marketId: 'test-market-1',
          yesPrice: 0.60,
          noPrice: 0.40,
          timestamp: Date.now(),
          priceChange: 'none',
        })
      })
      
      // Price goes up
      act(() => {
        priceListener({
          marketId: 'test-market-1',
          yesPrice: 0.65,
          noPrice: 0.35,
          timestamp: Date.now(),
          priceChange: 'up',
        })
      })
      
      expect(result.current.priceChange).toBe('up')
    })

    it('should clear isLive after timeout', async () => {
      jest.useFakeTimers()
      
      let priceListener: Function = () => {}
      mockSubscribe.mockImplementation((_marketId, listener) => {
        priceListener = listener
        return jest.fn()
      })
      
      const { result } = renderHook(() => usePriceUpdates('test-market-1'), { wrapper: Wrapper })
      
      act(() => {
        priceListener({
          marketId: 'test-market-1',
          yesPrice: 0.65,
          noPrice: 0.35,
          timestamp: Date.now(),
          priceChange: 'up',
        })
      })
      
      expect(result.current.isLive).toBe(true)
      
      act(() => {
        jest.advanceTimersByTime(3000)
      })
      
      expect(result.current.isLive).toBe(false)
      
      jest.useRealTimers()
    })
  })

  describe('With onUpdate callback', () => {
    it('should call onUpdate callback when price changes', () => {
      const onUpdate = jest.fn()
      let priceListener: Function = () => {}
      mockSubscribe.mockImplementation((_marketId, listener) => {
        priceListener = listener
        return jest.fn()
      })
      
      renderHook(() => usePriceUpdates('test-market-1', { onUpdate }), { wrapper: Wrapper })
      
      act(() => {
        priceListener({
          marketId: 'test-market-1',
          yesPrice: 0.65,
          noPrice: 0.35,
          timestamp: Date.now(),
          priceChange: 'up',
        })
      })
      
      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
        marketId: 'test-market-1',
        yesPrice: 0.65,
      }))
    })
  })
})

describe('usePriceConnection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return initial disconnected status', () => {
    mockGetConnectionStatus.mockReturnValue('disconnected')
    
    const { result } = renderHook(() => usePriceConnection(), { wrapper: Wrapper })
    
    expect(result.current.status).toBe('disconnected')
    expect(result.current.isConnected).toBe(false)
    expect(result.current.isConnecting).toBe(false)
    expect(result.current.hasError).toBe(false)
  })

  it('should return connected status', () => {
    let connectionListener: Function = () => {}
    mockOnConnectionChange.mockImplementation((listener) => {
      connectionListener = listener
      return jest.fn()
    })
    mockGetConnectionStatus.mockReturnValue('connected')
    
    const { result } = renderHook(() => usePriceConnection(), { wrapper: Wrapper })
    
    act(() => {
      connectionListener('connected')
    })
    
    expect(result.current.status).toBe('connected')
    expect(result.current.isConnected).toBe(true)
    expect(result.current.isConnecting).toBe(false)
  })

  it('should return connecting status', () => {
    let connectionListener: Function = () => {}
    mockOnConnectionChange.mockImplementation((listener) => {
      connectionListener = listener
      return jest.fn()
    })
    
    const { result } = renderHook(() => usePriceConnection(), { wrapper: Wrapper })
    
    act(() => {
      connectionListener('connecting')
    })
    
    expect(result.current.status).toBe('connecting')
    expect(result.current.isConnecting).toBe(true)
  })

  it('should return error status', () => {
    let connectionListener: Function = () => {}
    mockOnConnectionChange.mockImplementation((listener) => {
      connectionListener = listener
      return jest.fn()
    })
    
    const { result } = renderHook(() => usePriceConnection(), { wrapper: Wrapper })
    
    act(() => {
      connectionListener('error')
    })
    
    expect(result.current.status).toBe('error')
    expect(result.current.hasError).toBe(true)
    expect(result.current.isConnected).toBe(false)
  })

  it('should unsubscribe from connection changes on unmount', () => {
    const removeListener = jest.fn()
    mockOnConnectionChange.mockReturnValue(removeListener)
    
    const { unmount } = renderHook(() => usePriceConnection(), { wrapper: Wrapper })
    unmount()
    
    expect(removeListener).toHaveBeenCalled()
  })
})

describe('PriceUpdaterContext', () => {
  it('should throw when used outside provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    expect(() => {
      renderHook(() => usePriceUpdaterContext())
    }).toThrow('usePriceUpdaterContext must be used within PriceUpdaterProvider')
    
    consoleError.mockRestore()
  })

  it('should provide PriceUpdater instance through context', () => {
    const { result } = renderHook(() => usePriceUpdaterContext(), { wrapper: Wrapper })
    
    expect(result.current).toBeDefined()
    expect(typeof result.current.subscribe).toBe('function')
    expect(typeof result.current.start).toBe('function')
    expect(typeof result.current.stop).toBe('function')
  })
})
