/**
 * Tests to verify React.memo memoization is properly applied to components.
 * These tests ensure that components are wrapped with memo to prevent unnecessary re-renders.
 */
import { MarketCard } from "../MarketCard";
import { BetCard } from "../BetCard";
import { CategoryTabs } from "../CategoryTabs";

type MemoComponent = { displayName?: string; type?: { name?: string } };

const getDisplayName = (component: MemoComponent) =>
  component.displayName ?? component.type?.name ?? "";

describe("Component Memoization", () => {
  describe("MarketCard", () => {
    it("should be memoized with React.memo", () => {
      // React.memo wraps component, setting $$typeof to Symbol(react.memo)
      // and stores original in 'type' property
      expect(MarketCard).toHaveProperty("$$typeof", Symbol.for("react.memo"));
    });

    it("should have the display name MarketCard", () => {
      // Memoized components should have a displayName for debugging      expect(getDisplayName(MarketCard)).toMatch(/MarketCard/);
    });
  });

  describe("BetCard", () => {
    it("should be memoized with React.memo", () => {
      expect(BetCard).toHaveProperty("$$typeof", Symbol.for("react.memo"));
    });

    it("should have the display name BetCard", () => {      expect(getDisplayName(BetCard)).toMatch(/BetCard/);
    });
  });

  describe("CategoryTabs", () => {
    it("should be memoized with React.memo", () => {
      expect(CategoryTabs).toHaveProperty("$$typeof", Symbol.for("react.memo"));
    });

    it("should have the display name CategoryTabs", () => {      expect(getDisplayName(CategoryTabs)).toMatch(/CategoryTabs/);
    });
  });
});
