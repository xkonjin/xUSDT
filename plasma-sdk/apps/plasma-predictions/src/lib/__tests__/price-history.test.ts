import { act, renderHook } from '@testing-library/react'
import { usePriceHistoryStore, type PriceSnapshot, type TimeRange } from '../price-history'

describe('usePriceHistoryStore', () => {
  beforeEach(() => {
    // Reset the store state before each test
    const { result } = renderHook(() => usePriceHistoryStore())
    act(() => {
      result.current.clearHistory()
    })
  })

  describe('addPriceSnapshot', () => {
    it('should add a price snapshot for a market', () => {
      const { result } = renderHook(() => usePriceHistoryStore())
      
      act(() => {
        result.current.addPriceSnapshot('market-1', 0.65)
      })

      const history = result.current.getHistory('market-1')
      expect(history.length).toBe(1)
      expect(history[0].price).toBe(0.65)
      expect(history[0].timestamp).toBeDefined()
    })

    it('should append multiple snapshots for same market', () => {
      const { result } = renderHook(() => usePriceHistoryStore())
      
      act(() => {
        result.current.addPriceSnapshot('market-1', 0.65)
        result.current.addPriceSnapshot('market-1', 0.68)
        result.current.addPriceSnapshot('market-1', 0.70)
      })

      const history = result.current.getHistory('market-1')
      expect(history.length).toBe(3)
      expect(history[0].price).toBe(0.65)
      expect(history[2].price).toBe(0.70)
    })

    it('should handle snapshots for multiple markets', () => {
      const { result } = renderHook(() => usePriceHistoryStore())
      
      act(() => {
        result.current.addPriceSnapshot('market-1', 0.65)
        result.current.addPriceSnapshot('market-2', 0.30)
      })

      expect(result.current.getHistory('market-1').length).toBe(1)
      expect(result.current.getHistory('market-2').length).toBe(1)
      expect(result.current.getHistory('market-1')[0].price).toBe(0.65)
      expect(result.current.getHistory('market-2')[0].price).toBe(0.30)
    })
  })

  describe('getHistory', () => {
    it('should return empty array for unknown market', () => {
      const { result } = renderHook(() => usePriceHistoryStore())
      
      const history = result.current.getHistory('unknown-market')
      expect(history).toEqual([])
    })

    it('should return full history when no time range specified', () => {
      const { result } = renderHook(() => usePriceHistoryStore())
      
      act(() => {
        result.current.addPriceSnapshot('market-1', 0.65)
        result.current.addPriceSnapshot('market-1', 0.68)
      })

      const history = result.current.getHistory('market-1')
      expect(history.length).toBe(2)
    })
  })

  describe('getHistoryForRange', () => {
    it('should filter history by 1h range', () => {
      const { result } = renderHook(() => usePriceHistoryStore())
      
      const now = Date.now()
      // Add snapshot from 30 minutes ago
      act(() => {
        result.current.addPriceSnapshotWithTimestamp('market-1', 0.65, now - 30 * 60 * 1000)
      })
      // Add snapshot from 2 hours ago (should be filtered out)
      act(() => {
        result.current.addPriceSnapshotWithTimestamp('market-1', 0.60, now - 2 * 60 * 60 * 1000)
      })

      const history = result.current.getHistoryForRange('market-1', '1h')
      expect(history.length).toBe(1)
      expect(history[0].price).toBe(0.65)
    })

    it('should filter history by 24h range', () => {
      const { result } = renderHook(() => usePriceHistoryStore())
      
      const now = Date.now()
      // Add snapshot from 12 hours ago
      act(() => {
        result.current.addPriceSnapshotWithTimestamp('market-1', 0.65, now - 12 * 60 * 60 * 1000)
      })
      // Add snapshot from 48 hours ago (should be filtered out)
      act(() => {
        result.current.addPriceSnapshotWithTimestamp('market-1', 0.60, now - 48 * 60 * 60 * 1000)
      })

      const history = result.current.getHistoryForRange('market-1', '24h')
      expect(history.length).toBe(1)
      expect(history[0].price).toBe(0.65)
    })

    it('should filter history by 7d range', () => {
      const { result } = renderHook(() => usePriceHistoryStore())
      
      const now = Date.now()
      // Add snapshot from 3 days ago
      act(() => {
        result.current.addPriceSnapshotWithTimestamp('market-1', 0.65, now - 3 * 24 * 60 * 60 * 1000)
      })
      // Add snapshot from 10 days ago (should be filtered out)
      act(() => {
        result.current.addPriceSnapshotWithTimestamp('market-1', 0.60, now - 10 * 24 * 60 * 60 * 1000)
      })

      const history = result.current.getHistoryForRange('market-1', '7d')
      expect(history.length).toBe(1)
      expect(history[0].price).toBe(0.65)
    })

    it('should filter history by 30d range', () => {
      const { result } = renderHook(() => usePriceHistoryStore())
      
      const now = Date.now()
      // Add snapshot from 15 days ago
      act(() => {
        result.current.addPriceSnapshotWithTimestamp('market-1', 0.65, now - 15 * 24 * 60 * 60 * 1000)
      })
      // Add snapshot from 45 days ago (should be filtered out)
      act(() => {
        result.current.addPriceSnapshotWithTimestamp('market-1', 0.60, now - 45 * 24 * 60 * 60 * 1000)
      })

      const history = result.current.getHistoryForRange('market-1', '30d')
      expect(history.length).toBe(1)
      expect(history[0].price).toBe(0.65)
    })
  })

  describe('getPriceChange', () => {
    it('should calculate positive price change', () => {
      const { result } = renderHook(() => usePriceHistoryStore())
      
      const now = Date.now()
      act(() => {
        result.current.addPriceSnapshotWithTimestamp('market-1', 0.50, now - 12 * 60 * 60 * 1000)
        result.current.addPriceSnapshotWithTimestamp('market-1', 0.65, now)
      })

      const change = result.current.getPriceChange('market-1', '24h')
      expect(change.absolute).toBeCloseTo(0.15, 2)
      expect(change.percent).toBeCloseTo(30, 1) // 30% increase
      expect(change.isPositive).toBe(true)
    })

    it('should calculate negative price change', () => {
      const { result } = renderHook(() => usePriceHistoryStore())
      
      const now = Date.now()
      act(() => {
        result.current.addPriceSnapshotWithTimestamp('market-1', 0.80, now - 12 * 60 * 60 * 1000)
        result.current.addPriceSnapshotWithTimestamp('market-1', 0.60, now)
      })

      const change = result.current.getPriceChange('market-1', '24h')
      expect(change.absolute).toBeCloseTo(-0.20, 2)
      expect(change.percent).toBeCloseTo(-25, 1)
      expect(change.isPositive).toBe(false)
    })

    it('should return zero change with no history', () => {
      const { result } = renderHook(() => usePriceHistoryStore())
      
      const change = result.current.getPriceChange('unknown-market', '24h')
      expect(change.absolute).toBe(0)
      expect(change.percent).toBe(0)
      expect(change.isPositive).toBe(true)
    })
  })

  describe('clearHistory', () => {
    it('should clear all history', () => {
      const { result } = renderHook(() => usePriceHistoryStore())
      
      act(() => {
        result.current.addPriceSnapshot('market-1', 0.65)
        result.current.addPriceSnapshot('market-2', 0.30)
      })

      expect(result.current.getHistory('market-1').length).toBe(1)
      expect(result.current.getHistory('market-2').length).toBe(1)

      act(() => {
        result.current.clearHistory()
      })

      expect(result.current.getHistory('market-1')).toEqual([])
      expect(result.current.getHistory('market-2')).toEqual([])
    })

    it('should clear history for specific market', () => {
      const { result } = renderHook(() => usePriceHistoryStore())
      
      act(() => {
        result.current.addPriceSnapshot('market-1', 0.65)
        result.current.addPriceSnapshot('market-2', 0.30)
      })

      act(() => {
        result.current.clearMarketHistory('market-1')
      })

      expect(result.current.getHistory('market-1')).toEqual([])
      expect(result.current.getHistory('market-2').length).toBe(1)
    })
  })

  describe('generateDemoHistory', () => {
    it('should generate random price history for demo mode', () => {
      const { result } = renderHook(() => usePriceHistoryStore())
      
      act(() => {
        result.current.generateDemoHistory('market-1', 0.65)
      })

      const history = result.current.getHistory('market-1')
      // Should generate at least some historical data points
      expect(history.length).toBeGreaterThan(10)
      
      // All prices should be within reasonable range (0 to 1)
      history.forEach(snapshot => {
        expect(snapshot.price).toBeGreaterThanOrEqual(0)
        expect(snapshot.price).toBeLessThanOrEqual(1)
      })
    })
  })
})
