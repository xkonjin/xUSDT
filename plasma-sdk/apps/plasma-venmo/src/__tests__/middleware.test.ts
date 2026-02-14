import { middleware, config } from '../middleware'
import { NextRequest } from 'next/server'

// Mock NextResponse and NextRequest for jsdom environment
jest.mock('next/server', () => {
  const mockHeaders = new Map<string, string>()
  
  return {
    NextResponse: {
      next: jest.fn(() => ({
        headers: {
          set: (key: string, value: string) => mockHeaders.set(key, value),
          get: (key: string) => mockHeaders.get(key),
        },
      })),
    },
    NextRequest: jest.fn().mockImplementation((url: string) => ({
      url,
      nextUrl: new URL(url),
    })),
  }
})

describe('middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('security headers', () => {
    it('sets X-Frame-Options to DENY', () => {
      const request = new NextRequest('http://localhost:3000/')
      const response = middleware(request)
      
      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
    })

    it('sets X-Content-Type-Options to nosniff', () => {
      const request = new NextRequest('http://localhost:3000/')
      const response = middleware(request)
      
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    })

    it('sets X-XSS-Protection header', () => {
      const request = new NextRequest('http://localhost:3000/')
      const response = middleware(request)
      
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
    })

    it('sets Referrer-Policy header', () => {
      const request = new NextRequest('http://localhost:3000/')
      const response = middleware(request)
      
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    })

    it('sets Permissions-Policy header', () => {
      const request = new NextRequest('http://localhost:3000/')
      const response = middleware(request)
      
      expect(response.headers.get('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=()')
    })
  })

  describe('middleware config', () => {
    it('has a valid matcher configuration', () => {
      expect(config).toBeDefined()
      expect(config.matcher).toBeDefined()
      expect(Array.isArray(config.matcher)).toBe(true)
    })

    it('excludes static files from middleware', () => {
      const matcher = config.matcher[0]
      expect(matcher).toContain('_next/static')
      expect(matcher).toContain('favicon.ico')
    })
  })
})
