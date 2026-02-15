"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePlasmaWallet } from "@plasma-pay/privy-auth";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Shield,
  Loader2,
  CreditCard,
  Smartphone,
  ChevronRight,
} from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";

const ZKP2POnrampV2 = dynamic(
  () => import("@/components/onramp/ZKP2POnrampV2"),
  { ssr: false }
);
const StripeOnramp = dynamic(() => import("@/components/onramp/StripeOnramp"), {
  ssr: false,
});

type OnrampMethod = "zkp2p" | "stripe" | null;

export default function AddFundsPage() {
  const router = useRouter();
  const { wallet, ready } = usePlasmaWallet();
  const [activeMethod, setActiveMethod] = useState<OnrampMethod>(null);

  const handleSuccess = () => {
    router.push("/onramp/success");
  };

  const handleClose = () => {
    setActiveMethod(null);
  };

  if (!ready) {
    return (
      <div className="min-h-dvh bg-[rgb(var(--bg-primary))] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
      </div>
    );
  }

  if (!wallet?.address) {
    return (
      <div className="min-h-dvh bg-[rgb(var(--bg-primary))] flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <p className="text-white/60 text-sm">
            Please sign in to add funds to your wallet.
          </p>
          <button
            onClick={() => router.push("/")}
            className="clay-button px-6 py-3 text-sm font-semibold"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const hasStripe = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  return (
    <div className="min-h-dvh bg-[rgb(var(--bg-primary))] px-4 py-6">
      <div className="mx-auto max-w-md">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-heading font-bold text-white mb-1">
            Add Funds
          </h1>
          <p className="text-white/50 text-sm">
            Choose how you want to add money to your Plenmo wallet.
          </p>
        </div>

        {/* Method Picker */}
        <div className="space-y-3">
          {/* ZKP2P Fiat */}
          <button
            onClick={() => setActiveMethod("zkp2p")}
            className="w-full flex items-center gap-4 p-5 rounded-2xl bg-[rgb(var(--bg-elevated))] border border-white/[0.06] hover:border-plenmo-500/30 hover:bg-white/[0.04] transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-plenmo-500/10 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-6 h-6 text-plenmo-500" />
            </div>
            <div className="flex-1 text-left">
              <span className="text-white font-semibold block">
                Venmo, Zelle, Cash App
              </span>
              <span className="text-white/40 text-sm">
                Pay with your existing apps via ZKP2P
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/40 transition-colors" />
          </button>

          {/* Stripe Card */}
          <button
            onClick={() => setActiveMethod("stripe")}
            disabled={!hasStripe}
            className="w-full flex items-center gap-4 p-5 rounded-2xl bg-[rgb(var(--bg-elevated))] border border-white/[0.06] hover:border-plenmo-500/30 hover:bg-white/[0.04] transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
          >
            <div className="w-12 h-12 rounded-xl bg-plenmo-500/10 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-6 h-6 text-plenmo-500" />
            </div>
            <div className="flex-1 text-left">
              <span className="text-white font-semibold block">
                Credit or Debit Card
              </span>
              <span className="text-white/40 text-sm">
                {hasStripe ? "Visa, Mastercard, Apple Pay" : "Coming soon"}
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/40 transition-colors" />
          </button>
        </div>

        {/* Info section */}
        <div className="mt-8 rounded-2xl bg-[rgb(var(--bg-elevated))] border border-white/[0.06] p-5">
          <h3 className="mb-4 font-heading font-semibold text-white text-sm">
            How it works
          </h3>
          <div className="space-y-3">
            {[
              "Choose your preferred payment method",
              "Complete the payment through the provider",
              "Receive USDT0 in your Plenmo wallet instantly",
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-plenmo-500/10 text-xs font-bold text-plenmo-500">
                  {i + 1}
                </div>
                <p className="text-sm text-white/50 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Security note */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-white/30">
          <Shield className="h-3.5 w-3.5" />
          <span>Secured by zero-knowledge proofs</span>
        </div>
      </div>

      {/* ZKP2P Modal */}
      {activeMethod === "zkp2p" && (
        <ModalPortal isOpen={true} onClose={handleClose} zIndex={110}>
          <ZKP2POnrampV2
            recipientAddress={wallet.address}
            defaultAmount="100"
            onSuccess={handleSuccess}
            onClose={handleClose}
          />
        </ModalPortal>
      )}

      {/* Stripe Modal */}
      {activeMethod === "stripe" && (
        <ModalPortal isOpen={true} onClose={handleClose} zIndex={110}>
          <StripeOnramp
            walletAddress={wallet.address}
            onSuccess={handleSuccess}
            onClose={handleClose}
          />
        </ModalPortal>
      )}
    </div>
  );
}
