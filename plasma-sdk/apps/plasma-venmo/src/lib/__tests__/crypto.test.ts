import { splitSignature, isValidAddress, truncateAddress } from '../crypto'

describe('crypto utilities', () => {
  describe('splitSignature', () => {
    it('correctly splits a valid signature', () => {
      // Example signature (65 bytes = 130 hex chars without 0x prefix)
      const signature = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1b' as `0x${string}`
      
      const { v, r, s } = splitSignature(signature)
      
      expect(r).toMatch(/^0x[a-f0-9]{64}$/i)
      expect(s).toMatch(/^0x[a-f0-9]{64}$/i)
      expect(v).toBeGreaterThanOrEqual(27)
      expect(v).toBeLessThanOrEqual(28)
    })

    it('normalizes v value to 27 or 28', () => {
      // Signature with v = 0 (should become 27)
      const signature = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef00' as `0x${string}`
      
      const { v } = splitSignature(signature)
      
      expect(v).toBe(27)
    })

    it('handles v = 1 correctly', () => {
      const signature = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef01' as `0x${string}`
      
      const { v } = splitSignature(signature)
      
      expect(v).toBe(28)
    })
  })

  describe('isValidAddress', () => {
    it('returns true for valid Ethereum addresses', () => {
      expect(isValidAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7')).toBe(true)
      expect(isValidAddress('0x0000000000000000000000000000000000000000')).toBe(true)
      expect(isValidAddress('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF')).toBe(true)
    })

    it('returns false for invalid addresses', () => {
      expect(isValidAddress('')).toBe(false)
      expect(isValidAddress('0x')).toBe(false)
      expect(isValidAddress('0x123')).toBe(false) // Too short
      expect(isValidAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7z')).toBe(false) // Invalid char
      expect(isValidAddress('742d35Cc6634C0532925a3b844Bc9e7595f0bEb7')).toBe(false) // Missing 0x
    })

    it('is case-insensitive', () => {
      expect(isValidAddress('0x742D35CC6634C0532925A3B844BC9E7595F0BEB7')).toBe(true)
      expect(isValidAddress('0x742d35cc6634c0532925a3b844bc9e7595f0beb7')).toBe(true)
    })
  })

  describe('truncateAddress', () => {
    it('truncates address with default parameters', () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7'
      const result = truncateAddress(address)
      
      expect(result).toBe('0x742d...bEb7')
    })

    it('truncates address with custom length', () => {
      const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7'
      const result = truncateAddress(address, 6)
      
      expect(result).toBe('0x742d35...f0bEb7')
    })

    it('returns empty string for empty input', () => {
      expect(truncateAddress('')).toBe('')
    })

    it('handles short addresses gracefully', () => {
      // Short strings still get truncated since the function doesn't check length
      const result = truncateAddress('0x123')
      expect(result).toContain('...')
    })
  })
})
