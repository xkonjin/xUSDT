/**
 * Tests for next.config.mjs performance optimizations
 */

describe('plasma-venmo next.config.mjs', () => {
  describe('Bundle Analyzer Configuration', () => {
    it('has bundle analyzer imported', () => {
      const { readFileSync } = require('fs')
      const { join } = require('path')
      const configPath = join(process.cwd(), 'next.config.mjs')
      const configContent = readFileSync(configPath, 'utf-8')
      expect(configContent).toContain('@next/bundle-analyzer')
    })

    it('has experimental.optimizePackageImports configured for lucide-react', () => {
      const { readFileSync } = require('fs')
      const { join } = require('path')
      const configPath = join(process.cwd(), 'next.config.mjs')
      const configContent = readFileSync(configPath, 'utf-8')
      expect(configContent).toContain("optimizePackageImports: ['lucide-react'")
    })

    it('has experimental config defined', () => {
      const { readFileSync } = require('fs')
      const { join } = require('path')
      const configPath = join(process.cwd(), 'next.config.mjs')
      const configContent = readFileSync(configPath, 'utf-8')
      expect(configContent).toContain('experimental:')
    })

    it('has image optimization with modern formats', () => {
      const { readFileSync } = require('fs')
      const { join } = require('path')
      const configPath = join(process.cwd(), 'next.config.mjs')
      const configContent = readFileSync(configPath, 'utf-8')
      expect(configContent).toContain('image/avif')
      expect(configContent).toContain('image/webp')
    })

    it('has compiler.removeConsole in production', () => {
      const { readFileSync } = require('fs')
      const { join } = require('path')
      const configPath = join(process.cwd(), 'next.config.mjs')
      const configContent = readFileSync(configPath, 'utf-8')
      expect(configContent).toContain('removeConsole')
      expect(configContent).toContain('compiler:')
    })
  })

  describe('Performance Headers', () => {
    it('has headers function defined', () => {
      const { readFileSync } = require('fs')
      const { join } = require('path')
      const configPath = join(process.cwd(), 'next.config.mjs')
      const configContent = readFileSync(configPath, 'utf-8')
      expect(configContent).toContain('async headers()')
    })

    it('has security headers configured', () => {
      const { readFileSync } = require('fs')
      const { join } = require('path')
      const configPath = join(process.cwd(), 'next.config.mjs')
      const configContent = readFileSync(configPath, 'utf-8')
      expect(configContent).toContain('X-Frame-Options')
    })
  })

  describe('Transpile Packages', () => {
    it('transpiles all required monorepo packages', () => {
      const { readFileSync } = require('fs')
      const { join } = require('path')
      const configPath = join(process.cwd(), 'next.config.mjs')
      const configContent = readFileSync(configPath, 'utf-8')
      const expectedPackages = [
        '@plasma-pay/core',
        '@plasma-pay/gasless',
        '@plasma-pay/privy-auth',
        '@plasma-pay/aggregator',
        '@plasma-pay/db',
        '@plasma-pay/ui',
      ]
      expectedPackages.forEach(pkg => {
        expect(configContent).toContain(pkg)
      })
    })
  })
})
