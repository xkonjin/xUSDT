/**
 * Tests for next.config.mjs performance optimizations
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('plasma-venmo next.config.mjs', () => {
  describe('Bundle Analyzer Configuration', () => {
    it('has bundle analyzer imported', () => {
      const configPath = join(process.cwd(), 'next.config.mjs')
      const configContent = readFileSync(configPath, 'utf-8')
      expect(configContent).toContain('@next/bundle-analyzer')
    })

    it('has experimental.optimizePackageImports configured for lucide-react', () => {
      const configPath = join(process.cwd(), 'next.config.mjs')
      const configContent = readFileSync(configPath, 'utf-8')
      expect(configContent).toContain("optimizePackageImports: ['lucide-react'")
    })

    it('has experimental config defined', () => {
      const configPath = join(process.cwd(), 'next.config.mjs')
      const configContent = readFileSync(configPath, 'utf-8')
      expect(configContent).toContain('experimental:')
    })

    it('has image optimization with modern formats', () => {
      const configPath = join(process.cwd(), 'next.config.mjs')
      const configContent = readFileSync(configPath, 'utf-8')
      expect(configContent).toContain('image/avif')
      expect(configContent).toContain('image/webp')
    })

    it('has compiler.removeConsole in production', () => {
      const configPath = join(process.cwd(), 'next.config.mjs')
      const configContent = readFileSync(configPath, 'utf-8')
      expect(configContent).toContain('removeConsole')
      expect(configContent).toContain('compiler:')
    })
  })

  describe('Performance Headers', () => {
    it('has headers function defined', () => {
      const configPath = join(process.cwd(), 'next.config.mjs')
      const configContent = readFileSync(configPath, 'utf-8')
      expect(configContent).toContain('async headers()')
    })

    it('has security headers configured', () => {
      const configPath = join(process.cwd(), 'next.config.mjs')
      const configContent = readFileSync(configPath, 'utf-8')
      expect(configContent).toContain('X-Frame-Options')
    })
  })

  describe('Transpile Packages', () => {
    it('transpiles all required monorepo packages', () => {
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
