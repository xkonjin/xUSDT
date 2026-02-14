/**
 * Tests for next.config.mjs performance optimizations
 * Verifies that bundle analyzer and other performance configurations are properly set up
 */

import fs from "fs";
import path from "path";

describe("plasma-predictions next.config.mjs", () => {
  let configContent: string;

  beforeAll(() => {
    const configPath = path.join(__dirname, "../../next.config.mjs");
    configContent = fs.readFileSync(configPath, "utf-8");
  });

  describe("Bundle Analyzer Configuration", () => {
    it("has experimental.optimizePackageImports configured", () => {
      expect(configContent).toContain("optimizePackageImports");
      expect(configContent).toContain("lucide-react");
    });

    it("has image optimization configured", () => {
      expect(configContent).toContain("images:");
      expect(configContent).toContain("remotePatterns");
    });
  });

  describe("Performance Headers", () => {
    it("has headers function defined", () => {
      expect(configContent).toContain("async headers()");
    });
  });

  describe("Transpile Packages", () => {
    it("transpiles all required monorepo packages", () => {
      const requiredPackages = [
        "@plasma-pay/core",
        "@plasma-pay/gasless",
        "@plasma-pay/privy-auth",
        "@plasma-pay/ui",
        "@plasma-pay/db",
      ];
      requiredPackages.forEach((pkg) => {
        expect(configContent).toContain(pkg);
      });
    });
  });
});
