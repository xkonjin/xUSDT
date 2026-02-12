/**
 * Tests for next.config.mjs performance optimizations
 * Verifies that bundle analyzer and other performance configurations are properly set up
 */

import fs from 'fs'
import path from 'path'

const configPath = path.resolve(__dirname, '../../next.config.mjs')
const configSource = fs.readFileSync(configPath, 'utf8')

describe('plasma-predictions next.config.mjs', () => {
  describe('Bundle Analyzer Configuration', () => {
    it('has experimental.optimizePackageImports configured', () => {
      expect(configSource).toContain('optimizePackageImports')
      expect(configSource).toContain("'framer-motion'")
    })

    it('has SWC minification enabled (default)', () => {
      expect(configSource).not.toContain('swcMinify: false')
    })

    it('has image optimization configured', () => {
      expect(configSource).toContain('images:')
    })
  })

  describe('Performance Headers', () => {
    it('has headers function defined', () => {
      expect(configSource).toContain('async headers()')
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
        expect(configSource).toContain(`'${pkg}'`)
      })
    })
  })
})
