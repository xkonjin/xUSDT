"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FirstSendQuestProps {
  isNewUser: boolean;
  hasSentFirstPayment: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

type QuestStep = "welcome" | "explain" | "guide" | "complete";

export function FirstSendQuest({
  isNewUser,
  hasSentFirstPayment,
  onComplete,
  onSkip,
}: FirstSendQuestProps) {
  const [step, setStep] = useState<QuestStep>("welcome");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isNewUser && !hasSentFirstPayment) {
      setIsVisible(true);
    }
  }, [isNewUser, hasSentFirstPayment]);

  if (!isVisible) return null;

  const handleNext = () => {
    const steps: QuestStep[] = ["welcome", "explain", "guide", "complete"];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    } else {
      onComplete();
      setIsVisible(false);
    }
  };

  const handleSkip = () => {
    onSkip();
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="mx-4 w-full max-w-md rounded-2xl bg-[rgb(var(--bg-elevated))] border border-white/[0.06] p-6"
          >
            {step === "welcome" && (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-plenmo-500">
                  <span className="text-3xl">👋</span>
                </div>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  Welcome to Plenmo!
                </h2>
                <p className="mb-6 text-white/60">
                  Let&apos;s send your first payment in under 60 seconds. No gas
                  fees, no complicated addresses.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleSkip}
                    className="flex-1 rounded-lg border border-white/[0.12] px-4 py-3 text-white/60 transition hover:bg-white/[0.05]"
                  >
                    Skip for now
                  </button>
                  <button
                    onClick={handleNext}
                    className="flex-1 rounded-lg bg-plenmo-500 hover:bg-plenmo-400 px-4 py-3 font-semibold text-white transition hover:opacity-90"
                  >
                    Let&apos;s go!
                  </button>
                </div>
              </div>
            )}

            {step === "explain" && (
              <div className="text-center">
                <div className="mb-6 grid grid-cols-3 gap-4">
                  <div className="rounded-xl bg-white/[0.04] p-4">
                    <div className="mb-2 text-2xl">🌍</div>
                    <p className="text-sm font-medium text-white">Global</p>
                    <p className="text-xs text-white/60">Send anywhere</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.04] p-4">
                    <div className="mb-2 text-2xl">⛽</div>
                    <p className="text-sm font-medium text-white">$0 Fees</p>
                    <p className="text-xs text-white/60">No gas ever</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.04] p-4">
                    <div className="mb-2 text-2xl">⚡</div>
                    <p className="text-sm font-medium text-white">Instant</p>
                    <p className="text-xs text-white/60">Seconds, not days</p>
                  </div>
                </div>
                <h2 className="mb-2 text-xl font-bold text-white">
                  Why Plenmo is Different
                </h2>
                <p className="mb-6 text-white/60">
                  Unlike Venmo, we work globally. Unlike crypto wallets,
                  we&apos;re simple. You get the best of both worlds.
                </p>
                <button
                  onClick={handleNext}
                  className="w-full rounded-lg bg-plenmo-500 hover:bg-plenmo-400 px-4 py-3 font-semibold text-white transition hover:opacity-90"
                >
                  Got it! Show me how
                </button>
              </div>
            )}

            {step === "guide" && (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-plenmo-500">
                  <span className="text-3xl">💸</span>
                </div>
                <h2 className="mb-2 text-xl font-bold text-white">
                  Ready to Send?
                </h2>
                <p className="mb-4 text-white/60">
                  Try sending $1 to a friend or family member. Watch how fast
                  and free it is!
                </p>
                <div className="mb-6 rounded-lg bg-white/[0.04] p-4 text-left">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.04] text-sm text-white">
                      1
                    </span>
                    <span className="text-white/70">
                      Tap the &quot;Send&quot; button
                    </span>
                  </div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.04] text-sm text-white">
                      2
                    </span>
                    <span className="text-white/70">
                      Enter recipient&apos;s username or email
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.04] text-sm text-white">
                      3
                    </span>
                    <span className="text-white/70">
                      Enter amount and confirm
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleNext}
                  className="w-full rounded-lg bg-plenmo-500 hover:bg-plenmo-400 px-4 py-3 font-semibold text-white transition hover:opacity-90"
                >
                  Start Sending
                </button>
              </div>
            )}

            {step === "complete" && (
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", duration: 0.5 }}
                  className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-plenmo-500"
                >
                  <span className="text-4xl">🎉</span>
                </motion.div>
                <h2 className="mb-2 text-2xl font-bold text-white">
                  You&apos;re All Set!
                </h2>
                <p className="mb-6 text-white/60">
                  You&apos;re ready to send and receive money globally,
                  instantly, and with zero fees.
                </p>
                <button
                  onClick={() => {
                    onComplete();
                    setIsVisible(false);
                  }}
                  className="w-full rounded-lg bg-plenmo-500 hover:bg-plenmo-400 px-4 py-3 font-semibold text-white transition hover:opacity-90"
                >
                  Get Started
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default FirstSendQuest;
