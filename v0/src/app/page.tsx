"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

export default function Home() {
  return (
    <main className="xui-grid" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <section className="xui-hero">
        <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          xUSDT Demo Playground
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08, duration: 0.25 }}>
          Test USD₮ payments with EIP‑3009 on Plasma — explore Merchant and Client flows.
        </motion.p>
      </section>

      <div className="xui-grid cols-2">
        <Card title="Trillionaire Toy Store" subtitle="Collect toys, play games, climb leaderboard">
          <p style={{ opacity: 0.8, marginBottom: 12 }}>Purchase rare toy NFTs, compete in skill and chance games, and earn USDT0 prizes.</p>
          <Link href="/store"><Button variant="primary">Visit Store →</Button></Link>
        </Card>
        <Card title="My Inventory" subtitle="Manage your toy collection">
          <p style={{ opacity: 0.8, marginBottom: 12 }}>Equip toys to boost your game performance and climb the leaderboard.</p>
          <Link href="/inventory"><Button variant="outline">View Inventory →</Button></Link>
        </Card>
        <Card title="Client Demo" subtitle="Sign & pay with EIP‑3009">
          <p style={{ opacity: 0.8, marginBottom: 12 }}>Request PaymentRequired, sign in-wallet, and settle on Plasma.</p>
          <Link href="/client"><Button variant="outline">Open Client →</Button></Link>
        </Card>
      </div>
      <div className="xui-grid" style={{ marginTop: 16 }}>
        <Card title="Merchant" subtitle="Inspect config & health">
          <p style={{ opacity: 0.8, marginBottom: 12 }}>Connect to your merchant API and verify readiness.</p>
          <Link href="/merchant"><Button variant="outline">Open Merchant →</Button></Link>
        </Card>
      </div>
    </main>
  );
}
