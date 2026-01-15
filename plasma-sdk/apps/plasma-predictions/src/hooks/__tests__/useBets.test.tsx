import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { type ReactNode } from 'react'
import { useUserBets, usePortfolioStats, usePlaceBet, useCashOut, useDemoUserBets, useDemoPortfolioStats, useDemoPlaceBet, useDemoCashOut } from '../useBets'
import { useDemoStore } from '@/lib/demo-store'
import type { PredictionMarket } from '@/lib/types'

// Mock the external dependencies
jest.mock('@plasma-pay/privy-auth', () => ({
  usePlasmaWallet: () => ({
    wallet: { address: '0x1234567890123456789012345678901234567890' },
    authenticated: true,
  }),
  useGaslessTransfer: () => ({
    signTransfer: jest.fn().mockResolvedValue({
      success: true,
      signature: '0xsignature',
      typedData: {},
    }),
  }),
}))

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

// Wrapper for react-query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  Wrapper.displayName = 'QueryClientWrapper'
  return Wrapper
}

describe('Demo Mode Hooks', () => {
  beforeEach(() => {
    // Reset demo store before each test
    const { result } = renderHook(() => useDemoStore())
    act(() => {
      result.current.resetDemoAccount()
      result.current.enableDemoMode()
    })
  })

  describe('useDemoUserBets', () => {
    it('should return empty array when no bets', () => {
      const { result } = renderHook(() => useDemoUserBets(), {
        wrapper: createWrapper(),
      })
      
      expect(result.current.data).toEqual([])
    })

    it('should return demo bets when in demo mode', () => {
      const { result: demoStoreResult } = renderHook(() => useDemoStore())
      
      act(() => {
        demoStoreResult.current.placeDemoBet({
          market: mockMarket,
          outcome: 'YES',
          amount: 100,
        })
      })

      const { result } = renderHook(() => useDemoUserBets(), {
        wrapper: createWrapper(),
      })
      
      expect(result.current.data?.length).toBe(1)
      expect(result.current.data?.[0].outcome).toBe('YES')
      expect(result.current.data?.[0].amount).toBe(100)
    })

    it('should convert DemoBet to UserBet format', () => {
      const { result: demoStoreResult } = renderHook(() => useDemoStore())
      
      act(() => {
        demoStoreResult.current.placeDemoBet({
          market: mockMarket,
          outcome: 'YES',
          amount: 100,
        })
      })

      const { result } = renderHook(() => useDemoUserBets(), {
        wrapper: createWrapper(),
      })
      
      const bet = result.current.data?.[0]
      expect(bet).toHaveProperty('id')
      expect(bet).toHaveProperty('marketId')
      expect(bet).toHaveProperty('market')
      expect(bet).toHaveProperty('userAddress')
      expect(bet).toHaveProperty('outcome')
      expect(bet).toHaveProperty('shares')
      expect(bet).toHaveProperty('amount')
      expect(bet).toHaveProperty('status')
      expect(bet).toHaveProperty('createdAt')
    })
  })

  describe('useDemoPortfolioStats', () => {
    it('should return zeros when no bets', () => {
      const { result } = renderHook(
        () => useDemoPortfolioStats([mockMarket]),
        { wrapper: createWrapper() }
      )
      
      expect(result.current.totalValue).toBe(0)
      expect(result.current.totalPnl).toBe(0)
      expect(result.current.activeBets).toBe(0)
    })

    it('should calculate portfolio stats from demo bets', () => {
      const { result: demoStoreResult } = renderHook(() => useDemoStore())
      
      act(() => {
        demoStoreResult.current.placeDemoBet({
          market: mockMarket,
          outcome: 'YES',
          amount: 100,
        })
      })

      const { result } = renderHook(
        () => useDemoPortfolioStats([mockMarket]),
        { wrapper: createWrapper() }
      )
      
      expect(result.current.activeBets).toBe(1)
      expect(result.current.totalValue).toBeGreaterThan(0)
    })
  })

  describe('useDemoPlaceBet', () => {
    it('should place a demo bet successfully', async () => {
      const wrapper = createWrapper()
      const { result: demoStoreResult } = renderHook(() => useDemoStore())
      
      const initialBalance = demoStoreResult.current.demoBalance

      const { result } = renderHook(() => useDemoPlaceBet(), { wrapper })
      
      await act(async () => {
        result.current.mutate({
          market: mockMarket,
          outcome: 'YES',
          amount: 100,
        })
      })

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Check balance was deducted
      const { result: updatedDemoStore } = renderHook(() => useDemoStore())
      expect(updatedDemoStore.current.demoBalance).toBe(initialBalance - 100)
      expect(updatedDemoStore.current.demoBets.length).toBe(1)
    })

    it('should fail when amount exceeds balance', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useDemoPlaceBet(), { wrapper })
      
      await act(async () => {
        result.current.mutate({
          market: mockMarket,
          outcome: 'YES',
          amount: 20000, // More than initial balance
        })
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })
  })

  describe('useDemoCashOut', () => {
    it('should cash out a demo bet at current price', async () => {
      const wrapper = createWrapper()
      const { result: demoStoreResult } = renderHook(() => useDemoStore())
      
      // Place a bet first
      let betId: string
      act(() => {
        const bet = demoStoreResult.current.placeDemoBet({
          market: mockMarket,
          outcome: 'YES',
          amount: 100,
        })
        betId = bet!.id
      })

      const balanceAfterBet = demoStoreResult.current.demoBalance

      const { result } = renderHook(() => useDemoCashOut(), { wrapper })
      
      await act(async () => {
        result.current.mutate({
          betId,
          currentPrice: 0.70, // Cashing out at higher price
        })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Check bet was cashed out
      const { result: updatedDemoStore } = renderHook(() => useDemoStore())
      const bet = updatedDemoStore.current.demoBets.find((b) => b.id === betId)
      expect(bet?.status).toBe('cashed_out')
      expect(updatedDemoStore.current.demoBalance).toBeGreaterThan(balanceAfterBet)
    })

    it('should not cash out already resolved bet', async () => {
      const wrapper = createWrapper()
      const { result: demoStoreResult } = renderHook(() => useDemoStore())
      
      // Place and resolve a bet
      let betId: string
      act(() => {
        const bet = demoStoreResult.current.placeDemoBet({
          market: mockMarket,
          outcome: 'YES',
          amount: 100,
        })
        betId = bet!.id
        demoStoreResult.current.resolveDemoBet(betId, true)
      })

      const { result } = renderHook(() => useDemoCashOut(), { wrapper })
      
      await act(async () => {
        result.current.mutate({
          betId,
          currentPrice: 0.70,
        })
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })
  })
})
