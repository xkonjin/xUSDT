import { PriceUpdater, PriceUpdate, ConnectionStatus } from '../price-updater'
import type { PredictionMarket } from '../types'

// Type aliases
type MockPriceListener = jest.Mock<void, [PriceUpdate]>
type MockConnectionListener = jest.Mock<void, [ConnectionStatus]>

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock market for testing
const mockMarket: PredictionMarket = {
  id: 'test-market-1',
  conditionId: 'cond-1',
  question: 'Will Bitcoin reach $100k?',
  category: 'crypto',
  endDate: '2025-12-31T23:59:59Z',
  resolved: false,
  yesPrice: 0.65,
  noPrice: 0.35,
  volume24h: 50000,
  totalVolume: 1000000,
  liquidity: 500000,
  createdAt: '2024-01-01T00:00:00Z',
}

const mockMarket2: PredictionMarket = {
  ...mockMarket,
  id: 'test-market-2',
  question: 'Will ETH flip BTC?',
  yesPrice: 0.25,
  noPrice: 0.75,
}

describe('PriceUpdater', () => {
  let priceUpdater: PriceUpdater

  beforeEach(() => {
    jest.useFakeTimers()
    mockFetch.mockClear()
    priceUpdater = new PriceUpdater()
  })

  afterEach(() => {
    priceUpdater.destroy()
    jest.useRealTimers()
  })

  describe('Initialization', () => {
    it('should initialize with disconnected status', () => {
      expect(priceUpdater.getConnectionStatus()).toBe('disconnected')
    })

    it('should have no subscriptions initially', () => {
      expect(priceUpdater.getSubscribedMarkets()).toEqual([])
    })

    it('should accept custom polling interval', () => {
      const customUpdater = new PriceUpdater({ pollingInterval: 60000 })
      expect(customUpdater).toBeDefined()
      customUpdater.destroy()
    })
  })

  describe('Subscription Management', () => {
    it('should subscribe to a market', () => {
      const listener: MockPriceListener = jest.fn()
      priceUpdater.subscribe('test-market-1', listener)
      expect(priceUpdater.getSubscribedMarkets()).toContain('test-market-1')
    })

    it('should allow multiple subscriptions to same market', () => {
      const listener1: MockPriceListener = jest.fn()
      const listener2: MockPriceListener = jest.fn()
      priceUpdater.subscribe('test-market-1', listener1)
      priceUpdater.subscribe('test-market-1', listener2)
      expect(priceUpdater.getSubscribedMarkets()).toContain('test-market-1')
    })

    it('should unsubscribe from a market', () => {
      const listener: MockPriceListener = jest.fn()
      const unsubscribe = priceUpdater.subscribe('test-market-1', listener)
      unsubscribe()
      expect(priceUpdater.getSubscribedMarkets()).not.toContain('test-market-1')
    })

    it('should keep market subscribed if other listeners exist', () => {
      const listener1: MockPriceListener = jest.fn()
      const listener2: MockPriceListener = jest.fn()
      const unsubscribe1 = priceUpdater.subscribe('test-market-1', listener1)
      priceUpdater.subscribe('test-market-1', listener2)
      unsubscribe1()
      expect(priceUpdater.getSubscribedMarkets()).toContain('test-market-1')
    })

    it('should subscribe to multiple markets', () => {
      const listener: MockPriceListener = jest.fn()
      priceUpdater.subscribe('test-market-1', listener)
      priceUpdater.subscribe('test-market-2', listener)
      expect(priceUpdater.getSubscribedMarkets()).toEqual(['test-market-1', 'test-market-2'])
    })
  })

  describe('Connection Status', () => {
    it('should notify connection status listeners', () => {
      const statusListener: MockConnectionListener = jest.fn()
      priceUpdater.onConnectionChange(statusListener)
      priceUpdater.start()
      expect(statusListener).toHaveBeenCalledWith('connecting')
    })

    it('should update status to connected on successful fetch', async () => {
      const statusListener: MockConnectionListener = jest.fn()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockMarket]),
      })

      priceUpdater.onConnectionChange(statusListener)
      priceUpdater.subscribe('test-market-1', jest.fn())
      priceUpdater.start()

      await jest.advanceTimersByTimeAsync(100)
      expect(statusListener).toHaveBeenCalledWith('connected')
    })

    it('should update status to error on failed fetch', async () => {
      const statusListener: MockConnectionListener = jest.fn()
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      priceUpdater.onConnectionChange(statusListener)
      priceUpdater.subscribe('test-market-1', jest.fn())
      priceUpdater.start()

      await jest.advanceTimersByTimeAsync(100)
      expect(statusListener).toHaveBeenCalledWith('error')
    })

    it('should allow removing connection listeners', () => {
      const statusListener: MockConnectionListener = jest.fn()
      const removeListener = priceUpdater.onConnectionChange(statusListener)
      removeListener()
      priceUpdater.start()
      // Should not be called after removal
      expect(statusListener).not.toHaveBeenCalled()
    })
  })

  describe('Price Updates (Polling)', () => {
    it('should fetch prices periodically', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([mockMarket]),
      })

      priceUpdater.subscribe('test-market-1', jest.fn())
      priceUpdater.start()

      // First fetch
      await jest.advanceTimersByTimeAsync(100)
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // After polling interval (30s default)
      await jest.advanceTimersByTimeAsync(30000)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should notify listeners on price update', async () => {
      const listener: MockPriceListener = jest.fn()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockMarket]),
      })

      priceUpdater.subscribe('test-market-1', listener)
      priceUpdater.start()

      await jest.advanceTimersByTimeAsync(100)
      
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        marketId: 'test-market-1',
        yesPrice: 0.65,
        noPrice: 0.35,
      }))
    })

    it('should include price change direction in update', async () => {
      const listener: MockPriceListener = jest.fn()
      
      // First fetch - establish baseline
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ ...mockMarket, yesPrice: 0.60 }]),
      })

      priceUpdater.subscribe('test-market-1', listener)
      priceUpdater.start()
      await jest.advanceTimersByTimeAsync(100)

      // Second fetch - price increased
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ ...mockMarket, yesPrice: 0.65 }]),
      })
      await jest.advanceTimersByTimeAsync(30000)

      const lastCall = listener.mock.calls[listener.mock.calls.length - 1][0]
      expect(lastCall.priceChange).toBe('up')
    })

    it('should detect price decrease', async () => {
      const listener: MockPriceListener = jest.fn()
      
      // First fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ ...mockMarket, yesPrice: 0.70 }]),
      })

      priceUpdater.subscribe('test-market-1', listener)
      priceUpdater.start()
      await jest.advanceTimersByTimeAsync(100)

      // Second fetch - price decreased
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ ...mockMarket, yesPrice: 0.65 }]),
      })
      await jest.advanceTimersByTimeAsync(30000)

      const lastCall = listener.mock.calls[listener.mock.calls.length - 1][0]
      expect(lastCall.priceChange).toBe('down')
    })

    it('should detect no price change', async () => {
      const listener: MockPriceListener = jest.fn()
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([mockMarket]),
      })

      priceUpdater.subscribe('test-market-1', listener)
      priceUpdater.start()
      await jest.advanceTimersByTimeAsync(100)
      await jest.advanceTimersByTimeAsync(30000)

      const lastCall = listener.mock.calls[listener.mock.calls.length - 1][0]
      expect(lastCall.priceChange).toBe('none')
    })

    it('should only notify relevant market listeners', async () => {
      const listener1: MockPriceListener = jest.fn()
      const listener2: MockPriceListener = jest.fn()
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockMarket]),
      })

      priceUpdater.subscribe('test-market-1', listener1)
      priceUpdater.subscribe('test-market-2', listener2)
      priceUpdater.start()

      await jest.advanceTimersByTimeAsync(100)
      
      expect(listener1).toHaveBeenCalled()
      expect(listener2).not.toHaveBeenCalled()
    })
  })

  describe('Start/Stop', () => {
    it('should start polling when start() is called', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      })

      priceUpdater.subscribe('test-market-1', jest.fn())
      expect(priceUpdater.getConnectionStatus()).toBe('disconnected')
      
      priceUpdater.start()
      await jest.advanceTimersByTimeAsync(100)
      
      expect(mockFetch).toHaveBeenCalled()
    })

    it('should stop polling when stop() is called', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      })

      priceUpdater.subscribe('test-market-1', jest.fn())
      priceUpdater.start()
      await jest.advanceTimersByTimeAsync(100)
      
      priceUpdater.stop()
      mockFetch.mockClear()
      
      await jest.advanceTimersByTimeAsync(30000)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should update status to disconnected when stopped', () => {
      const statusListener: MockConnectionListener = jest.fn()
      priceUpdater.onConnectionChange(statusListener)
      
      priceUpdater.start()
      priceUpdater.stop()
      
      expect(statusListener).toHaveBeenLastCalledWith('disconnected')
    })

    it('should not start multiple polling loops', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      })

      priceUpdater.subscribe('test-market-1', jest.fn())
      priceUpdater.start()
      priceUpdater.start()
      priceUpdater.start()
      
      await jest.advanceTimersByTimeAsync(100)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error Handling', () => {
    it('should continue polling after fetch error', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([mockMarket]),
        })

      const listener: MockPriceListener = jest.fn()
      priceUpdater.subscribe('test-market-1', listener)
      priceUpdater.start()

      await jest.advanceTimersByTimeAsync(100) // First fetch fails
      await jest.advanceTimersByTimeAsync(30000) // Second fetch succeeds

      expect(listener).toHaveBeenCalled()
    })

    it('should handle malformed API response gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(null),
      })

      const listener: MockPriceListener = jest.fn()
      priceUpdater.subscribe('test-market-1', listener)
      priceUpdater.start()

      await jest.advanceTimersByTimeAsync(100)
      // Should not throw
      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('Cleanup', () => {
    it('should clean up resources on destroy()', () => {
      const statusListener: MockConnectionListener = jest.fn()
      priceUpdater.onConnectionChange(statusListener)
      priceUpdater.subscribe('test-market-1', jest.fn())
      priceUpdater.start()
      
      priceUpdater.destroy()
      
      expect(priceUpdater.getSubscribedMarkets()).toEqual([])
      expect(priceUpdater.getConnectionStatus()).toBe('disconnected')
    })
  })
})
