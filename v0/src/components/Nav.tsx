"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { POLYMARKET_ENABLED } from "../lib/polymarket-config";

/**
 * Navigation Component
 *
 * Main navigation bar with links to app sections.
 * Polymarket link is conditionally rendered based on feature flag.
 */
export function Nav() {
  return (
    <motion.nav
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="xui-nav"
    >
      <div className="xui-nav-inner">
        <Link href="/" className="xui-brand">
          <span className="xui-brand-mark" /> xUSDT Demo
        </Link>
        <div className="xui-nav-links">
          {/* Polymarket predictions - conditionally rendered via feature flag */}
          {POLYMARKET_ENABLED && (
            <Link href="/predictions" className="xui-link">Predictions</Link>
          )}
          <Link href="/client" className="xui-link">Client</Link>
          <a href="https://github.com/xkonjin/xUSDT" target="_blank" rel="noopener noreferrer" className="xui-link">GitHub ↗</a>
        </div>
      </div>
    </motion.nav>
  );
}

export default Nav;


