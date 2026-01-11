import { withRetry, isRetryableError, makeRetryable } from '../retry'

describe('retry utilities', () => {
  describe('isRetryableError', () => {
    it('returns true for network errors', () => {
      expect(isRetryableError(new Error('Network error'))).toBe(true)
      expect(isRetryableError(new Error('fetch failed'))).toBe(true)
      expect(isRetryableError(new Error('connection refused'))).toBe(true)
    })

    it('returns true for timeout errors', () => {
      expect(isRetryableError(new Error('Request timeout'))).toBe(true)
      expect(isRetryableError(new Error('Operation timed out'))).toBe(true)
    })

    it('returns true for server errors', () => {
      expect(isRetryableError(new Error('500 Internal Server Error'))).toBe(true)
      expect(isRetryableError(new Error('502 Bad Gateway'))).toBe(true)
      expect(isRetryableError(new Error('503 Service Unavailable'))).toBe(true)
    })

    it('returns true for rate limit errors', () => {
      expect(isRetryableError(new Error('Rate limit exceeded'))).toBe(true)
      expect(isRetryableError(new Error('429 Too Many Requests'))).toBe(true)
    })

    it('returns false for insufficient balance errors', () => {
      expect(isRetryableError(new Error('Insufficient balance'))).toBe(false)
    })

    it('returns false for invalid input errors', () => {
      expect(isRetryableError(new Error('Invalid address'))).toBe(false)
      expect(isRetryableError(new Error('Transaction rejected'))).toBe(false)
    })

    it('returns false for auth errors', () => {
      expect(isRetryableError(new Error('Unauthorized'))).toBe(false)
      expect(isRetryableError(new Error('Forbidden'))).toBe(false)
    })

    it('returns false for not found errors', () => {
      expect(isRetryableError(new Error('Not found'))).toBe(false)
      expect(isRetryableError(new Error('404 error'))).toBe(false)
    })
  })

  describe('withRetry', () => {
    it('returns result on first success', async () => {
      const fn = jest.fn().mockResolvedValue('success')
      
      const result = await withRetry(fn)
      
      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('retries on failure and succeeds', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success')
      
      const result = await withRetry(fn, { maxAttempts: 3, initialDelay: 10 })
      
      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(2)
    }, 10000)

    it('throws after max attempts exceeded', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Network error'))
      
      await expect(
        withRetry(fn, { maxAttempts: 2, initialDelay: 10 })
      ).rejects.toThrow('Network error')
      expect(fn).toHaveBeenCalledTimes(2)
    }, 10000)

    it('does not retry non-retryable errors', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Insufficient balance'))
      
      await expect(
        withRetry(fn, { maxAttempts: 3, retryOn: isRetryableError })
      ).rejects.toThrow('Insufficient balance')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('uses exponential backoff', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success')
      
      const result = await withRetry(fn, { 
        maxAttempts: 3, 
        initialDelay: 10,
        backoffFactor: 2,
      })
      
      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(3)
    }, 10000)
  })

  describe('makeRetryable', () => {
    it('creates a retryable version of a function', async () => {
      const originalFn = jest.fn().mockResolvedValue('result')
      const retryableFn = makeRetryable(originalFn)
      
      const result = await retryableFn()
      
      expect(result).toBe('result')
      expect(originalFn).toHaveBeenCalled()
    })

    it('passes arguments to the original function', async () => {
      const originalFn = jest.fn().mockResolvedValue('result')
      const retryableFn = makeRetryable(originalFn)
      
      await retryableFn('arg1', 'arg2')
      
      expect(originalFn).toHaveBeenCalledWith('arg1', 'arg2')
    })
  })
})
