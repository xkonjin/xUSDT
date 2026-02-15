/**
 * Tests for next.config.mjs performance optimizations
 */

import { readFileSync } from "fs";
import { join } from "path";

describe("plasma-venmo next.config.mjs", () => {
  const configContent = readFileSync(
    join(process.cwd(), "next.config.mjs"),
    "utf-8"
  );

  describe("Performance Optimizations", () => {
    it("has experimental.optimizePackageImports configured for lucide-react", () => {
      expect(configContent).toContain("optimizePackageImports");
      expect(configContent).toContain("lucide-react");
    });

    it("has experimental config defined", () => {
      expect(configContent).toContain("experimental:");
    });

    it("has image optimization with modern formats", () => {
      expect(configContent).toContain("image/avif");
      expect(configContent).toContain("image/webp");
    });

    it("has compiler.removeConsole in production", () => {
      expect(configContent).toContain("removeConsole");
      expect(configContent).toContain("compiler:");
    });
  });

  describe("Performance Headers", () => {
    it("has headers function defined", () => {
      expect(configContent).toContain("async headers()");
    });

    it("has security headers configured", () => {
      expect(configContent).toContain("X-Frame-Options");
    });
  });

  describe("Transpile Packages", () => {
    it("transpiles all required monorepo packages", () => {
      const expectedPackages = [
        "@plasma-pay/core",
        "@plasma-pay/gasless",
        "@plasma-pay/privy-auth",
        "@plasma-pay/aggregator",
        "@plasma-pay/db",
        "@plasma-pay/ui",
      ];
      expectedPackages.forEach((pkg) => {
        expect(configContent).toContain(pkg);
      });
    });
  });
});
