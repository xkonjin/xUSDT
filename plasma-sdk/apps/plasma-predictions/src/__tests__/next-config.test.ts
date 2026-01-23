/**
 * Tests for next.config.mjs performance optimizations
 * Verifies that bundle analyzer and other performance configurations are properly set up
 */

// Import the next.config.mjs file - need to use require for .mjs
let nextConfig: any
try {
  const configModule = require('../../../next.config.mjs')
  nextConfig = configModule.default || configModule
} catch (error) {
  // Will fail initially before we implement
  console.error('Could not load next.config.mjs:', error)
}

describe('plasma-predictions next.config.mjs', () => {
  describe('Bundle Analyzer Configuration', () => {
    it('has experimental.optimizePackageImports configured', () => {
      expect(nextConfig?.experimental?.optimizePackageImports).toBeDefined()
      expect(nextConfig?.experimental?.optimizePackageImports.length).toBeGreaterThan(0)
    })

    it('has SWC minification enabled (default)', () => {
      expect(nextConfig?.swcMinify).not.toBe(false)
    })

    it('has image optimization configured', () => {
      expect(nextConfig?.images).toBeDefined()
    })
  })

  describe('Performance Headers', () => {
    it('has headers function defined', () => {
      expect(typeof nextConfig?.headers).toBe('function')
    })
  })

  describe('Transpile Packages', () => {
    it('transpiles all required monorepo packages', () => {
      const requiredPackages = [
        '@plasma-pay/core',
        '@plasma-pay/gasless',
        '@plasma-pay/privy-auth',
        '@plasma-pay/ui',
        '@plasma-pay/db',
      ]
      requiredPackages.forEach(pkg => {
        expect(nextConfig?.transpilePackages).toContain(pkg)
      })
    })
  })
})
