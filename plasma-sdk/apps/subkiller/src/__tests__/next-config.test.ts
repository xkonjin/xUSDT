/**
 * Tests for next.config.mjs performance optimizations
 * Verifies that bundle analyzer and other performance configurations are properly set up
 */

type NextConfig = {
  experimental?: {
    optimizePackageImports?: string[];
  };
  swcMinify?: boolean;
  transpilePackages?: string[];
};

let nextConfig: NextConfig | null = null;

beforeAll(async () => {
  try {
    const configModule = await import('../../../next.config.mjs');
    nextConfig = (configModule.default ?? configModule) as NextConfig;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Could not load next.config.mjs:', message);
  }
});

describe('subkiller next.config.mjs', () => {
  describe('Bundle Analyzer Configuration', () => {
    it('has experimental.optimizePackageImports configured', () => {
      expect(nextConfig?.experimental?.optimizePackageImports).toBeDefined();
      expect(nextConfig?.experimental?.optimizePackageImports?.length ?? 0).toBeGreaterThan(0);
    });

    it('has SWC minification enabled (default)', () => {
      expect(nextConfig?.swcMinify).not.toBe(false);
    });
  });

  describe('Transpile Packages', () => {
    it('transpiles all required monorepo packages', () => {
      const requiredPackages = [
        '@plasma-pay/core',
        '@plasma-pay/gasless',
        '@plasma-pay/x402',
        '@plasma-pay/db',
        '@plasma-pay/ui',
        '@plasma-pay/privy-auth',
      ];
      requiredPackages.forEach((pkg) => {
        expect(nextConfig?.transpilePackages).toContain(pkg);
      });
    });
  });
});
