"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePlasmaWallet } from "@plasma-pay/privy-auth";
import { ZKP2POnramp } from "@/components/onramp/ZKP2POnramp";
import { ArrowLeft, Shield, Loader2 } from "lucide-react";

export default function AddFundsPage() {
  const router = useRouter();
  const { wallet, ready } = usePlasmaWallet();
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSuccess = (txHash: string) => {
    console.log("Onramp successful:", txHash);
    setShowSuccess(true);
  };

  const handleClose = () => {
    if (showSuccess) {
      router.push("/");
    } else {
      router.back();
    }
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

        {/* ZKP2P Onramp Component */}
        <ZKP2POnramp
          recipientAddress={wallet.address}
          onSuccess={handleSuccess}
          onClose={handleClose}
          defaultAmount="100"
          defaultCurrency="USD"
        />

        {/* Info section */}
        <div className="mt-6 rounded-2xl bg-[rgb(var(--bg-elevated))] border border-white/[0.06] p-5">
          <h3 className="mb-4 font-heading font-semibold text-white text-sm">
            How it works
          </h3>
          <div className="space-y-3">
            {[
              "Choose your amount and preferred payment method (Venmo, Revolut, etc.)",
              "Complete the payment through the ZKP2P extension",
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
    </div>
  );
}
