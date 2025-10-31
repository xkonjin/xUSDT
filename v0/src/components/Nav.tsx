"use client";

import Link from "next/link";
import { motion } from "framer-motion";

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
          <Link href="/client" className="xui-link">Client</Link>
          <Link href="/merchant" className="xui-link">Merchant</Link>
          <a href="https://github.com/xkonjin/xUSDT" target="_blank" rel="noopener noreferrer" className="xui-link">GitHub ↗</a>
        </div>
      </div>
    </motion.nav>
  );
}

export default Nav;


