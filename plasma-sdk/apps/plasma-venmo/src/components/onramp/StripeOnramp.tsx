"use client";

import { useState, useEffect, useRef } from "react";
import { CreditCard, Loader2, AlertCircle, X } from "lucide-react";

interface StripeOnrampProps {
  walletAddress: string;
  amount?: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

export function StripeOnramp({
  walletAddress,
  amount,
  onSuccess,
  onClose,
}: StripeOnrampProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const initRef = useRef(false);

  const retrySession = () => {
    initRef.current = false;
    setClientSecret(null);
    setError(null);
    setLoading(true);
  };

  // Create session on mount (guarded against StrictMode double-call)
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    let cancelled = false;

    async function createSession() {
      try {
        const response = await fetch("/api/stripe-onramp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress,
            amount,
            currency: "usd",
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "Failed to initialize payment");
        }

        const data = await response.json();
        if (!cancelled) setClientSecret(data.clientSecret);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to initialize payment"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    createSession();

    return () => {
      cancelled = true;
    };
  }, [walletAddress, amount, error]);

  // Load Stripe onramp element when we have clientSecret
  useEffect(() => {
    if (!clientSecret) return;

    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      setError("Stripe is not configured");
      return;
    }

    let mounted = true;

    async function loadOnramp() {
      try {
        const { loadStripe } = await import("@stripe/stripe-js");
        const stripe = await loadStripe(publishableKey!);
        if (!stripe || !mounted) return;

        const container = document.getElementById("stripe-onramp-element");
        if (!container) return;

        // Stripe Crypto Onramp session via Stripe.js
        const stripeExt = stripe as unknown as Record<string, unknown>;
        const createFn = stripeExt.createCryptoOnrampSession;

        if (typeof createFn !== "function") {
          if (mounted) {
            console.error(
              "[stripe-onramp] createCryptoOnrampSession not available on Stripe instance"
            );
            setError(
              "Stripe crypto onramp is not available. Try another payment method."
            );
          }
          return;
        }

        const onrampSession = (
          createFn as (opts: Record<string, unknown>) => {
            mount: (el: string) => void;
            addEventListener?: (
              event: string,
              cb: (e: { payload: { session: { status: string } } }) => void
            ) => void;
          }
        )({
          clientSecret: clientSecret!,
          appearance: {
            theme: "night",
            variables: {
              colorPrimary: "#1DB954",
              colorBackground: "#141419",
              colorText: "#ffffff",
            },
          },
        });

        onrampSession.mount("#stripe-onramp-element");
        onrampSession.addEventListener?.(
          "onramp_session_updated",
          (event: { payload: { session: { status: string } } }) => {
            if (event.payload.session.status === "fulfillment_complete") {
              onSuccess?.();
            }
          }
        );
      } catch (err) {
        if (mounted) {
          console.error("[stripe-onramp] Load error:", err);
          setError("Failed to load payment widget. Card payments coming soon.");
        }
      }
    }

    loadOnramp();

    return () => {
      mounted = false;
    };
  }, [clientSecret, onSuccess]);

  return (
    <div className="bg-[rgb(var(--bg-elevated))] border border-white/[0.06] rounded-2xl overflow-hidden max-w-md w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <CreditCard className="w-5 h-5 text-plenmo-500" />
          <h2 className="text-lg font-bold text-white">Pay with Card</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-8 h-8 text-plenmo-500 animate-spin" />
            <p className="text-white/50 text-sm">Setting up payment...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <AlertCircle className="w-12 h-12 text-amber-400/60" />
            <p className="text-white/60 text-sm text-center">{error}</p>
            <button
              onClick={retrySession}
              className="text-plenmo-500 text-sm hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Stripe mounts here */}
        <div
          id="stripe-onramp-element"
          className={loading || error ? "hidden" : ""}
          style={{ minHeight: 400 }}
        />
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-white/5 bg-white/[0.02]">
        <p className="text-white/30 text-xs text-center">
          Powered by Stripe &middot; Card payments
        </p>
      </div>
    </div>
  );
}

export default StripeOnramp;
