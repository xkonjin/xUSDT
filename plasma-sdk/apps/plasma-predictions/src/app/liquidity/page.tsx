"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Droplets, TrendingUp, DollarSign, Plus, Minus, 
  AlertCircle, Clock
} from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { useDemoStore } from "@/lib/demo-store";

// Mock LP positions for demo
const mockPositions = [
  {
    id: "1",
    market: "Will Bitcoin reach $100K by end of 2026?",
    deposited: 1000,
    currentValue: 1045,
    feesEarned: 45,
    apy: 18.5,
    share: 2.3,
  },
  {
    id: "2", 
    market: "Will AI pass the Turing test by 2027?",
    deposited: 500,
    currentValue: 512,
    feesEarned: 12,
    apy: 12.2,
    share: 1.1,
  },
];

export default function LiquidityPage() {
  const { isDemoMode } = useDemoStore();
  const [positions] = useState(mockPositions);
  const [, setShowAddModal] = useState(false);
  const [, setSelectedPosition] = useState<string | null>(null);

  const totalTVL = positions.reduce((sum, p) => sum + p.currentValue, 0);
  const totalFees = positions.reduce((sum, p) => sum + p.feesEarned, 0);
  const avgAPY = positions.length > 0 
    ? positions.reduce((sum, p) => sum + p.apy, 0) / positions.length 
    : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-20 md:pb-8">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 pt-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Liquidity Dashboard</h1>
          <p className="text-white/60">
            Earn fees by providing liquidity to prediction markets
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard
            icon={<DollarSign className="w-5 h-5 text-green-400" />}
            label="Total Value Locked"
            value={`$${totalTVL.toLocaleString()}`}
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-cyan-400" />}
            label="Total Fees Earned"
            value={`$${totalFees.toFixed(2)}`}
          />
          <StatCard
            icon={<Droplets className="w-5 h-5 text-purple-400" />}
            label="Average APY"
            value={`${avgAPY.toFixed(1)}%`}
          />
        </div>

        {/* Demo Mode Notice */}
        {isDemoMode && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-400 font-medium">Demo Mode Active</p>
                <p className="text-yellow-400/70 text-sm">
                  LP features show simulated data. Connect a real wallet to provide liquidity.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Positions List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Your Positions</h2>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl font-medium transition"
            >
              <Plus className="w-4 h-4" />
              Add Liquidity
            </button>
          </div>

          {positions.length === 0 ? (
            <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/10">
              <Droplets className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/60 mb-4">No liquidity positions yet</p>
              <button 
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl font-medium transition"
              >
                Add Your First Position
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {positions.map((position) => (
                <PositionCard 
                  key={position.id}
                  position={position}
                  onRemove={() => setSelectedPosition(position.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Historical Chart Placeholder */}
        <div className="mt-8 p-6 bg-white/5 rounded-2xl border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">Earnings History</h3>
          <div className="h-48 flex items-center justify-center">
            <div className="text-center">
              <Clock className="w-8 h-8 text-white/20 mx-auto mb-2" />
              <p className="text-white/40 text-sm">Historical chart coming soon</p>
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-white/40">{label}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function PositionCard({ position, onRemove }: { position: typeof mockPositions[0]; onRemove: () => void }) {
  const pnl = position.currentValue - position.deposited;
  const pnlPercent = (pnl / position.deposited) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-white font-medium line-clamp-1">{position.market}</p>
          <p className="text-xs text-white/40 mt-1">
            {position.share}% pool share
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs rounded-lg font-medium">
            {position.apy}% APY
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <p className="text-xs text-white/40">Deposited</p>
          <p className="text-sm font-medium text-white">${position.deposited}</p>
        </div>
        <div>
          <p className="text-xs text-white/40">Current Value</p>
          <p className="text-sm font-medium text-white">${position.currentValue}</p>
        </div>
        <div>
          <p className="text-xs text-white/40">Fees Earned</p>
          <p className="text-sm font-medium text-green-400">+${position.feesEarned}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-white/10">
        <div className="flex items-center gap-1">
          <TrendingUp className={`w-4 h-4 ${pnl >= 0 ? "text-green-400" : "text-red-400"}`} />
          <span className={`text-sm font-medium ${pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
            {pnl >= 0 ? "+" : ""}{pnlPercent.toFixed(1)}%
          </span>
        </div>
        <button
          onClick={onRemove}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm transition"
        >
          <Minus className="w-3.5 h-3.5" />
          Remove
        </button>
      </div>
    </motion.div>
  );
}
