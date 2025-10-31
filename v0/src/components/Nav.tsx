"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useCart } from "@/app/lib/cart";
import { useWallet } from "@/app/lib/wallet";
import React from "react";

export function Nav() {
  const { cart } = useCart();
  const { account, connected } = useWallet();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const count = mounted ? Object.values(cart).reduce((s, n) => s + n, 0) : 0;
  const acct = mounted && connected ? `${account.slice(0,6)}…${account.slice(-4)}` : "";
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
          <Link href="/toys" className="xui-link">Toys</Link>
          <Link href="/cart" className="xui-link">{`Cart${count ? ` (${count})` : ""}`}</Link>
          <Link href="/inventory" className="xui-link">Inventory</Link>
          <Link href="/leaderboard" className="xui-link">Leaderboard</Link>
          <Link href="/client" className="xui-link">Client</Link>
          <Link href="/merchant" className="xui-link">Merchant</Link>
          <a href="https://github.com/xkonjin/xUSDT" target="_blank" rel="noopener noreferrer" className="xui-link">GitHub ↗</a>
          {acct ? <span className="xui-link text-neutral-500 cursor-default">{acct}</span> : null}
        </div>
      </div>
    </motion.nav>
  );
}

export default Nav;


