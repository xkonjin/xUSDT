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
          <span className="xui-brand-mark" /> xUSDT
        </Link>
        <div className="xui-nav-links">
          <Link href="/predictions" className="xui-link">Markets</Link>
          <Link href="/predictions/leaderboard" className="xui-link">Leaderboard</Link>
          <Link href="/predictions/my" className="xui-link">My Bets</Link>
          <Link href="/predictions/profile" className="xui-link">Profile</Link>
        </div>
      </div>
    </motion.nav>
  );
}

export default Nav;


