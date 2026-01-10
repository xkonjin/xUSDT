"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "./Button";
import { Card, CardContent } from "./Card";
import { Spinner } from "./Spinner";
import { Modal } from "./Modal";

export interface WalletManagerProps {
  address: string | null;
  balance: string | null;
  balanceLoading?: boolean;
  onRefreshBalance?: () => void;
  onFundWallet?: (options?: { amount?: string; method?: string }) => void;
  onConnectExternalWallet?: () => void;
  onDisconnect?: () => void;
  minBalanceRequired?: number;
  className?: string;
}

export function WalletManager({
  address,
  balance,
  balanceLoading,
  onRefreshBalance,
  onFundWallet,
  onConnectExternalWallet,
  onDisconnect,
  minBalanceRequired,
  className = "",
}: WalletManagerProps) {
  const [copied, setCopied] = useState(false);
  const [showFundOptions, setShowFundOptions] = useState(false);

  const numericBalance = balance ? parseFloat(balance) : 0;
  const isLowBalance = minBalanceRequired !== undefined && numericBalance < minBalanceRequired;

  const copyAddress = useCallback(async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy address:", err);
    }
  }, [address]);

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!address) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <p className="text-white/50 text-center mb-4">No wallet connected</p>
          {onConnectExternalWallet && (
            <Button onClick={onConnectExternalWallet} className="w-full">
              Connect Wallet
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardContent className="p-4 space-y-4">
          {/* Address Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                <WalletIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white/50 text-xs">Wallet Address</p>
                <button
                  onClick={copyAddress}
                  className="text-white font-mono text-sm hover:text-cyan-400 transition-colors flex items-center gap-1"
                >
                  {shortenAddress(address)}
                  {copied ? (
                    <CheckIcon className="w-3 h-3 text-green-400" />
                  ) : (
                    <CopyIcon className="w-3 h-3 text-white/50" />
                  )}
                </button>
              </div>
            </div>
            {onDisconnect && (
              <button
                onClick={onDisconnect}
                className="text-white/40 hover:text-red-400 text-xs transition-colors"
              >
                Disconnect
              </button>
            )}
          </div>

          {/* Balance Row */}
          <div className={`p-3 rounded-xl ${isLowBalance ? 'bg-red-500/10 border border-red-500/30' : 'bg-white/5'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/50 text-xs">USDT0 Balance</p>
                {balanceLoading ? (
                  <Spinner size="sm" />
                ) : (
                  <p className={`text-2xl font-bold ${isLowBalance ? 'text-red-400' : 'text-white'}`}>
                    ${numericBalance.toFixed(2)}
                  </p>
                )}
              </div>
              {onRefreshBalance && (
                <button
                  onClick={onRefreshBalance}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  disabled={balanceLoading}
                >
                  <RefreshIcon className={`w-4 h-4 text-white/50 ${balanceLoading ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>
            {isLowBalance && minBalanceRequired && (
              <p className="text-red-400 text-xs mt-2">
                Minimum ${minBalanceRequired.toFixed(2)} required for this payment
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {onFundWallet && (
              <Button
                onClick={() => setShowFundOptions(true)}
                className={isLowBalance ? 'bg-cyan-500 hover:bg-cyan-600' : ''}
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                Add Funds
              </Button>
            )}
            {onConnectExternalWallet && (
              <Button variant="secondary" onClick={onConnectExternalWallet}>
                <LinkIcon className="w-4 h-4 mr-1" />
                Link Wallet
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fund Options Modal */}
      <Modal
        isOpen={showFundOptions}
        onClose={() => setShowFundOptions(false)}
        title="Add Funds to Wallet"
      >
        <div className="space-y-3">
          <FundOption
            icon={<CreditCardIcon className="w-5 h-5" />}
            title="Buy with Card"
            description="Use MoonPay or Coinbase to buy USDT0 with credit/debit card"
            onClick={() => {
              onFundWallet?.({ method: 'card' });
              setShowFundOptions(false);
            }}
          />
          <FundOption
            icon={<WalletIcon className="w-5 h-5" />}
            title="Transfer from Wallet"
            description="Send USDT0 from MetaMask, Rabby, or other wallet"
            onClick={() => {
              onFundWallet?.({ method: 'wallet' });
              setShowFundOptions(false);
            }}
          />
          <FundOption
            icon={<ExchangeIcon className="w-5 h-5" />}
            title="Transfer from Exchange"
            description="Withdraw from Coinbase, Binance, or other exchange"
            onClick={() => {
              onFundWallet?.({ method: 'exchange' });
              setShowFundOptions(false);
            }}
          />
          <FundOption
            icon={<QRIcon className="w-5 h-5" />}
            title="Show QR Code"
            description="Scan to send funds to this wallet address"
            onClick={() => {
              onFundWallet?.({ method: 'manual' });
              setShowFundOptions(false);
            }}
          />
        </div>
      </Modal>
    </>
  );
}

interface FundOptionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

function FundOption({ icon, title, description, onClick }: FundOptionProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left"
    >
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/20 flex items-center justify-center text-cyan-400">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-white font-medium">{title}</p>
        <p className="text-white/50 text-sm">{description}</p>
      </div>
      <ChevronRightIcon className="w-5 h-5 text-white/30" />
    </button>
  );
}

// Inline Icons
function WalletIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function CopyIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function RefreshIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function PlusIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function LinkIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

function CreditCardIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function ExchangeIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  );
}

function QRIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
    </svg>
  );
}

function ChevronRightIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

export default WalletManager;
