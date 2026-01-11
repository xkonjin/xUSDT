import { 
  MIN_AMOUNT, 
  MAX_AMOUNT, 
  MAX_MEMO_LENGTH,
  AMOUNT_TOO_SMALL,
  AMOUNT_TOO_LARGE,
  MEMO_TOO_LONG,
} from '../constants'

describe('constants', () => {
  describe('amount limits', () => {
    it('MIN_AMOUNT is a small positive number', () => {
      expect(MIN_AMOUNT).toBeGreaterThan(0)
      expect(MIN_AMOUNT).toBeLessThan(1)
    })

    it('MAX_AMOUNT is a reasonable maximum', () => {
      expect(MAX_AMOUNT).toBeGreaterThan(1000)
      expect(MAX_AMOUNT).toBeLessThanOrEqual(100000)
    })

    it('MIN_AMOUNT is less than MAX_AMOUNT', () => {
      expect(MIN_AMOUNT).toBeLessThan(MAX_AMOUNT)
    })
  })

  describe('memo limits', () => {
    it('MAX_MEMO_LENGTH is reasonable', () => {
      expect(MAX_MEMO_LENGTH).toBeGreaterThan(50)
      expect(MAX_MEMO_LENGTH).toBeLessThanOrEqual(500)
    })
  })

  describe('error messages', () => {
    it('AMOUNT_TOO_SMALL contains minimum amount', () => {
      expect(AMOUNT_TOO_SMALL).toContain(MIN_AMOUNT.toFixed(2))
    })

    it('AMOUNT_TOO_LARGE contains maximum amount', () => {
      expect(AMOUNT_TOO_LARGE).toContain(MAX_AMOUNT.toLocaleString())
    })

    it('MEMO_TOO_LONG contains max length', () => {
      expect(MEMO_TOO_LONG).toContain(MAX_MEMO_LENGTH.toString())
    })
  })
})
