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

describe('plasma-stream next.config.mjs', () => {
  describe('Bundle Analyzer Configuration', () => {
    it('has experimental.optimizePackageImports configured', () => {
      expect(nextConfig?.experimental?.optimizePackageImports).toBeDefined()
      expect(nextConfig?.experimental?.optimizePackageImports.length).toBeGreaterThan(0)
    })

    it('has SWC minification enabled (default)', () => {
      expect(nextConfig?.swcMinify).not.toBe(false)
    })
  })

  describe('Transpile Packages', () => {
    it('transpiles all required monorepo packages', () => {
      const requiredPackages = [
        '@plasma-pay/core',
        '@plasma-pay/gasless',
        '@plasma-pay/privy-auth',
        '@plasma-pay/db',
        '@plasma-pay/ui',
      ]
      requiredPackages.forEach(pkg => {
        expect(nextConfig?.transpilePackages).toContain(pkg)
      })
    })
  })
})
