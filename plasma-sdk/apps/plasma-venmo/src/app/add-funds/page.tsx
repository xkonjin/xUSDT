'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ZKP2POnramp } from '@/components/onramp/ZKP2POnramp';

export default function AddFundsPage() {
  const router = useRouter();
  const [showSuccess, setShowSuccess] = useState(false);

  // In production, this would come from the user's wallet
  const userWalletAddress = '0x0000000000000000000000000000000000000000';

  const handleSuccess = (txHash: string) => {
    console.log('Onramp successful:', txHash);
    setShowSuccess(true);
  };

  const handleClose = () => {
    if (showSuccess) {
      router.push('/');
    } else {
      router.back();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-8">
      <div className="mx-auto max-w-md">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        {/* ZKP2P Onramp Component */}
        <ZKP2POnramp
          recipientAddress={userWalletAddress}
          onSuccess={handleSuccess}
          onClose={handleClose}
          defaultAmount="100"
          defaultCurrency="USD"
        />

        {/* Info section */}
        <div className="mt-6 rounded-xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-semibold text-gray-900">How it works</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                1
              </div>
              <p className="text-sm text-gray-600">
                Choose your amount and preferred payment method (Venmo, Revolut, etc.)
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                2
              </div>
              <p className="text-sm text-gray-600">
                Complete the payment through the Peer extension
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                3
              </div>
              <p className="text-sm text-gray-600">
                Receive USDC in your Plenmo wallet instantly
              </p>
            </div>
          </div>
        </div>

        {/* Security note */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Secured by zero-knowledge proofs</span>
        </div>
      </div>
    </div>
  );
}
