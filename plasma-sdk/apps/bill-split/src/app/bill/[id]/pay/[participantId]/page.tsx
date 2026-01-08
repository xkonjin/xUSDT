"use client";

/**
 * Bill Participant Payment Page
 * 
 * Allows a participant to pay their share of a bill.
 */

import { useState, useEffect } from "react";
import { usePlasmaWallet, useUSDT0Balance } from "@plasma-pay/privy-auth";
import { parseUnits } from "viem";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { createTransferParams, buildTransferAuthorizationTypedData } from "@plasma-pay/gasless";
import { PLASMA_MAINNET_CHAIN_ID, USDT0_ADDRESS } from "@plasma-pay/core";

interface BillPayData {
  billId: string;
  billTitle: string;
  creatorAddress: string;
  participant: {
    id: string;
    name: string;
    share: number;
    paid: boolean;
    txHash?: string;
  };
}

// Helper to split signature
function splitSignature(signature: `0x${string}`): { v: number; r: `0x${string}`; s: `0x${string}` } {
  const sig = signature.slice(2);
  const r = `0x${sig.slice(0, 64)}` as `0x${string}`;
  const s = `0x${sig.slice(64, 128)}` as `0x${string}`;
  let v = parseInt(sig.slice(128, 130), 16);
  if (v < 27) v += 27;
  return { v, r, s };
}

export default function BillPayPage({
  params,
}: {
  params: Promise<{ id: string; participantId: string }>;
}) {
  // Resolve params
  const [billId, setBillId] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  
  useEffect(() => {
    params.then(p => {
      setBillId(p.id);
      setParticipantId(p.participantId);
    });
  }, [params]);

  // Wallet state
  const { authenticated, ready, wallet, login } = usePlasmaWallet();
  const { formatted: balance } = useUSDT0Balance();

  // Page state
  const [payData, setPayData] = useState<BillPayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch bill and participant data
  useEffect(() => {
    if (!billId || !participantId) return;

    async function fetchData() {
      try {
        const response = await fetch(`/api/bills/${billId}`);
        if (!response.ok) {
          setError('Bill not found');
          setLoading(false);
          return;
        }

        const data = await response.json();
        const participant = data.bill.participants.find((p: any) => p.id === participantId);
        
        if (!participant) {
          setError('Participant not found');
          setLoading(false);
          return;
        }

        setPayData({
          billId: data.bill.id,
          billTitle: data.bill.title,
          creatorAddress: data.bill.creatorAddress,
          participant: {
            id: participant.id,
            name: participant.name,
            share: participant.share,
            paid: participant.paid,
            txHash: participant.txHash,
          },
        });
      } catch (err) {
        setError('Failed to load bill');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [billId, participantId]);

  // Handle payment
  async function handlePay() {
    if (!wallet || !payData) return;

    setPaying(true);
    setError(null);

    try {
      // Parse amount
      const amountInUnits = parseUnits(payData.participant.share.toString(), 6);

      // Create transfer params
      const params = createTransferParams(
        wallet.address,
        payData.creatorAddress as `0x${string}`,
        amountInUnits
      );

      // Build typed data
      const typedData = buildTransferAuthorizationTypedData(params, {
        chainId: PLASMA_MAINNET_CHAIN_ID,
        tokenAddress: USDT0_ADDRESS,
      });

      // Sign
      const signature = await wallet.signTypedData(typedData);
      const { v, r, s } = splitSignature(signature);

      // Submit to API
      const response = await fetch(`/api/bills/${billId}/pay/${participantId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: params.from,
          to: params.to,
          value: params.value.toString(),
          validAfter: params.validAfter,
          validBefore: params.validBefore,
          nonce: params.nonce,
          v,
          r,
          s,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Payment failed');
      }

      setSuccess(result.txHash);
      setPayData(prev => prev ? {
        ...prev,
        participant: { ...prev.participant, paid: true, txHash: result.txHash },
      } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setPaying(false);
    }
  }

  // Loading
  if (loading || !ready) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[rgb(0,212,255)] animate-spin" />
      </main>
    );
  }

  // Error
  if (error && !payData) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 mb-4">{error}</p>
          <Link href="/" className="text-[rgb(0,212,255)] hover:underline">
            Go home
          </Link>
        </div>
      </main>
    );
  }

  if (!payData) return null;

  // Already paid / success
  if (payData.participant.paid || success) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="p-8 rounded-3xl bg-white/5">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Payment Complete!</h1>
            <p className="text-4xl font-bold gradient-text my-4">
              ${payData.participant.share.toFixed(2)}
            </p>
            <p className="text-white/50 mb-6">
              for {payData.billTitle}
            </p>
            
            {(success || payData.participant.txHash) && (
              <a
                href={`https://scan.plasma.to/tx/${success || payData.participant.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[rgb(0,212,255)] hover:underline"
              >
                View transaction
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            
            <div className="mt-6">
              <Link href={`/bill/${billId}`} className="text-white/50 hover:text-white">
                ← Back to bill
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Payment UI
  return (
    <main className="min-h-screen p-4 md:p-8">
      <header className="flex items-center gap-4 mb-6">
        <Link href={`/bill/${billId}`} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white/60" />
        </Link>
        <h1 className="text-xl font-semibold text-white">Pay Your Share</h1>
      </header>

      <div className="max-w-md mx-auto">
        <div className="p-8 rounded-3xl bg-white/5 text-center">
          <p className="text-white/50 mb-2">{payData.billTitle}</p>
          <p className="text-white/70 text-lg mb-4">
            Hi <span className="font-bold text-white">{payData.participant.name}</span>!
          </p>
          
          <p className="text-white/50 mb-2">Your share</p>
          <p className="text-5xl font-bold gradient-text mb-6">
            ${payData.participant.share.toFixed(2)}
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm mb-4">
              {error}
            </div>
          )}

          {authenticated && balance && (
            <p className="text-white/40 text-sm mb-4">
              Balance: ${balance} USDT0
            </p>
          )}

          {!authenticated ? (
            <button onClick={login} className="w-full btn-primary">
              Login to Pay
            </button>
          ) : (
            <button
              onClick={handlePay}
              disabled={paying}
              className="w-full btn-primary disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {paying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay $${payData.participant.share.toFixed(2)} USDT0`
              )}
            </button>
          )}

          <p className="text-white/30 text-xs mt-4">
            Zero gas fees on Plasma Chain
          </p>
        </div>
      </div>
    </main>
  );
}

