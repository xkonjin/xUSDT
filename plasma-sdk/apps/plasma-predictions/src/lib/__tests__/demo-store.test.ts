import { act, renderHook } from '@testing-library/react'
import { useDemoStore, formatDemoBalance } from '../demo-store'
import type { PredictionMarket } from '../types'

// Mock market for testing
const mockMarket: PredictionMarket = {
  id: 'test-market-1',
  conditionId: 'cond-1',
  question: 'Will Bitcoin reach $100k by end of year?',
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

const resolvedMarket: PredictionMarket = {
  ...mockMarket,
  id: 'resolved-market-1',
  resolved: true,
  outcome: 'YES',
}

describe('useDemoStore', () => {
  beforeEach(() => {
    // Reset the store state before each test
    const { result } = renderHook(() => useDemoStore())
    act(() => {
      result.current.resetDemoAccount()
      result.current.disableDemoMode()
    })
  })

  describe('Demo Mode Toggle', () => {
    it('should start with demo mode disabled', () => {
      const { result } = renderHook(() => useDemoStore())
      expect(result.current.isDemoMode).toBe(false)
    })

    it('should enable demo mode', () => {
      const { result } = renderHook(() => useDemoStore())
      act(() => {
        result.current.enableDemoMode()
      })
      expect(result.current.isDemoMode).toBe(true)
    })

    it('should toggle demo mode', () => {
      const { result } = renderHook(() => useDemoStore())
      act(() => {
        result.current.toggleDemoMode()
      })
      expect(result.current.isDemoMode).toBe(true)
      act(() => {
        result.current.toggleDemoMode()
      })
      expect(result.current.isDemoMode).toBe(false)
    })
  })

  describe('Demo Balance', () => {
    it('should start with initial balance of $10,000', () => {
      const { result } = renderHook(() => useDemoStore())
      expect(result.current.demoBalance).toBe(10000)
    })

    it('should format demo balance correctly', () => {
      expect(formatDemoBalance(10000)).toBe('$10,000.00')
      expect(formatDemoBalance(1234.56)).toBe('$1,234.56')
      expect(formatDemoBalance(0)).toBe('$0.00')
    })
  })

  describe('Place Demo Bet', () => {
    it('should place a YES bet and deduct from balance', () => {
      const { result } = renderHook(() => useDemoStore())
      
      act(() => {
        result.current.placeDemoBet({
          market: mockMarket,
          outcome: 'YES',
          amount: 100,
        })
      })

      expect(result.current.demoBalance).toBe(9900)
      expect(result.current.demoBets.length).toBe(1)
      expect(result.current.demoBets[0].outcome).toBe('YES')
      expect(result.current.demoBets[0].amount).toBe(100)
      expect(result.current.demoBets[0].shares).toBeCloseTo(100 / 0.65, 2)
    })

    it('should place a NO bet correctly', () => {
      const { result } = renderHook(() => useDemoStore())
      
      act(() => {
        result.current.placeDemoBet({
          market: mockMarket,
          outcome: 'NO',
          amount: 50,
        })
      })

      expect(result.current.demoBets[0].outcome).toBe('NO')
      expect(result.current.demoBets[0].shares).toBeCloseTo(50 / 0.35, 2)
    })

    it('should reject bet exceeding balance', () => {
      const { result } = renderHook(() => useDemoStore())
      
      let bet: any
      act(() => {
        bet = result.current.placeDemoBet({
          market: mockMarket,
          outcome: 'YES',
          amount: 20000,
        })
      })

      expect(bet).toBeNull()
      expect(result.current.demoBalance).toBe(10000)
    })

    it('should reject bet with zero or negative amount', () => {
      const { result } = renderHook(() => useDemoStore())
      
      let bet: any
      act(() => {
        bet = result.current.placeDemoBet({
          market: mockMarket,
          outcome: 'YES',
          amount: 0,
        })
      })
      expect(bet).toBeNull()

      act(() => {
        bet = result.current.placeDemoBet({
          market: mockMarket,
          outcome: 'YES',
          amount: -100,
        })
      })
      expect(bet).toBeNull()
    })
  })

  describe('Bet Resolution', () => {
    it('should resolve a winning bet and credit winnings', () => {
      const { result } = renderHook(() => useDemoStore())
      
      let betId: string
      act(() => {
        const bet = result.current.placeDemoBet({
          market: mockMarket,
          outcome: 'YES',
          amount: 100,
        })
        betId = bet!.id
      })

      const bet = result.current.demoBets[0]
      const expectedWinnings = bet.shares // Each share pays $1 on win

      act(() => {
        result.current.resolveDemoBet(betId, true)
      })

      expect(result.current.demoBets[0].status).toBe('won')
      expect(result.current.demoBalance).toBeCloseTo(9900 + expectedWinnings, 2)
    })

    it('should resolve a losing bet with no payout', () => {
      const { result } = renderHook(() => useDemoStore())
      
      let betId: string
      act(() => {
        const bet = result.current.placeDemoBet({
          market: mockMarket,
          outcome: 'YES',
          amount: 100,
        })
        betId = bet!.id
      })

      act(() => {
        result.current.resolveDemoBet(betId, false)
      })

      expect(result.current.demoBets[0].status).toBe('lost')
      expect(result.current.demoBalance).toBe(9900) // No change for loss
    })

    it('should not resolve already resolved bet', () => {
      const { result } = renderHook(() => useDemoStore())
      
      let betId: string
      act(() => {
        const bet = result.current.placeDemoBet({
          market: mockMarket,
          outcome: 'YES',
          amount: 100,
        })
        betId = bet!.id
      })

      act(() => {
        result.current.resolveDemoBet(betId, true)
      })
      
      const balanceAfterFirstResolve = result.current.demoBalance

      act(() => {
        result.current.resolveDemoBet(betId, true) // Try to resolve again
      })

      expect(result.current.demoBalance).toBe(balanceAfterFirstResolve)
    })
  })

  describe('Auto-Resolution Simulation', () => {
    it('should auto-resolve bets for ended markets', () => {
      const { result } = renderHook(() => useDemoStore())
      
      const endedMarket: PredictionMarket = {
        ...mockMarket,
        id: 'ended-market',
        endDate: '2024-01-01T00:00:00Z', // Past date
        resolved: true,
        outcome: 'YES',
      }

      act(() => {
        result.current.placeDemoBet({
          market: endedMarket,
          outcome: 'YES',
          amount: 100,
        })
      })

      // Trigger auto-resolution check
      act(() => {
        result.current.checkAndResolveExpiredBets()
      })

      expect(result.current.demoBets[0].status).toBe('won')
    })

    it('should mark losing bets correctly on auto-resolution', () => {
      const { result } = renderHook(() => useDemoStore())
      
      const endedMarket: PredictionMarket = {
        ...mockMarket,
        id: 'ended-market',
        endDate: '2024-01-01T00:00:00Z',
        resolved: true,
        outcome: 'NO', // Market resolved NO
      }

      act(() => {
        result.current.placeDemoBet({
          market: endedMarket,
          outcome: 'YES', // User bet YES
          amount: 100,
        })
      })

      act(() => {
        result.current.checkAndResolveExpiredBets()
      })

      expect(result.current.demoBets[0].status).toBe('lost')
    })
  })

  describe('Cash Out Functionality', () => {
    it('should cash out bet at current market price', () => {
      const { result } = renderHook(() => useDemoStore())
      
      let betId: string
      act(() => {
        const bet = result.current.placeDemoBet({
          market: mockMarket,
          outcome: 'YES',
          amount: 100,
        })
        betId = bet!.id
      })

      const initialBalance = result.current.demoBalance
      const bet = result.current.demoBets[0]
      const cashOutValue = bet.shares * mockMarket.yesPrice // Shares * current price

      act(() => {
        result.current.cashOutDemoBet(betId, mockMarket.yesPrice)
      })

      expect(result.current.demoBets[0].status).toBe('cashed_out')
      expect(result.current.demoBalance).toBeCloseTo(initialBalance + cashOutValue, 2)
    })

    it('should not cash out already resolved bet', () => {
      const { result } = renderHook(() => useDemoStore())
      
      let betId: string
      act(() => {
        const bet = result.current.placeDemoBet({
          market: mockMarket,
          outcome: 'YES',
          amount: 100,
        })
        betId = bet!.id
      })

      act(() => {
        result.current.resolveDemoBet(betId, true)
      })

      const balanceAfterResolve = result.current.demoBalance

      act(() => {
        result.current.cashOutDemoBet(betId, 0.70)
      })

      expect(result.current.demoBalance).toBe(balanceAfterResolve)
    })
  })

  describe('Portfolio Stats Calculation', () => {
    it('should calculate stats with no bets', () => {
      const { result } = renderHook(() => useDemoStore())
      
      const stats = result.current.getDemoStats()
      
      expect(stats.totalBets).toBe(0)
      expect(stats.wins).toBe(0)
      expect(stats.losses).toBe(0)
      expect(stats.winRate).toBe(0)
    })

    it('should calculate portfolio value for active bets', () => {
      const { result } = renderHook(() => useDemoStore())
      
      act(() => {
        result.current.placeDemoBet({
          market: mockMarket,
          outcome: 'YES',
          amount: 100,
        })
      })

      const stats = result.current.getPortfolioStats([mockMarket])
      const bet = result.current.demoBets[0]
      const expectedValue = bet.shares * mockMarket.yesPrice

      expect(stats.totalValue).toBeCloseTo(expectedValue, 2)
      expect(stats.activeBets).toBe(1)
    })

    it('should calculate total P&L correctly', () => {
      const { result } = renderHook(() => useDemoStore())
      
      act(() => {
        result.current.placeDemoBet({
          market: mockMarket,
          outcome: 'YES',
          amount: 100,
        })
      })

      const stats = result.current.getPortfolioStats([mockMarket])
      const bet = result.current.demoBets[0]
      const currentValue = bet.shares * mockMarket.yesPrice
      const expectedPnl = currentValue - bet.amount

      expect(stats.totalPnl).toBeCloseTo(expectedPnl, 2)
    })

    it('should calculate win rate from resolved bets', () => {
      const { result } = renderHook(() => useDemoStore())
      
      let bet1Id: string, bet2Id: string, bet3Id: string
      act(() => {
        const bet1 = result.current.placeDemoBet({ market: mockMarket, outcome: 'YES', amount: 100 })
        const bet2 = result.current.placeDemoBet({ market: mockMarket, outcome: 'NO', amount: 100 })
        const bet3 = result.current.placeDemoBet({ market: mockMarket, outcome: 'YES', amount: 100 })
        bet1Id = bet1!.id
        bet2Id = bet2!.id
        bet3Id = bet3!.id
      })

      act(() => {
        result.current.resolveDemoBet(bet1Id, true) // Win
        result.current.resolveDemoBet(bet2Id, false) // Loss
        result.current.resolveDemoBet(bet3Id, true) // Win
      })

      const stats = result.current.getDemoStats()
      expect(stats.wins).toBe(2)
      expect(stats.losses).toBe(1)
      expect(stats.winRate).toBeCloseTo(2/3, 2)
    })
  })

  describe('Active Demo Bets', () => {
    it('should return only active bets', () => {
      const { result } = renderHook(() => useDemoStore())
      
      let bet1Id: string
      act(() => {
        const bet1 = result.current.placeDemoBet({ market: mockMarket, outcome: 'YES', amount: 100 })
        result.current.placeDemoBet({ market: mockMarket, outcome: 'NO', amount: 50 })
        bet1Id = bet1!.id
      })

      act(() => {
        result.current.resolveDemoBet(bet1Id, true)
      })

      const activeBets = result.current.getActiveDemoBets()
      expect(activeBets.length).toBe(1)
      expect(activeBets[0].outcome).toBe('NO')
    })
  })

  describe('Reset Demo Account', () => {
    it('should reset balance and clear all bets', () => {
      const { result } = renderHook(() => useDemoStore())
      
      act(() => {
        result.current.placeDemoBet({ market: mockMarket, outcome: 'YES', amount: 100 })
        result.current.placeDemoBet({ market: mockMarket, outcome: 'NO', amount: 50 })
      })

      expect(result.current.demoBets.length).toBe(2)
      expect(result.current.demoBalance).toBe(9850)

      act(() => {
        result.current.resetDemoAccount()
      })

      expect(result.current.demoBets.length).toBe(0)
      expect(result.current.demoBalance).toBe(10000)
    })
  })
})
