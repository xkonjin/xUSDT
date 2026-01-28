'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FirstSendQuestProps {
  isNewUser: boolean;
  hasSentFirstPayment: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

type QuestStep = 'welcome' | 'explain' | 'guide' | 'complete';

export function FirstSendQuest({
  isNewUser,
  hasSentFirstPayment,
  onComplete,
  onSkip,
}: FirstSendQuestProps) {
  const [step, setStep] = useState<QuestStep>('welcome');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isNewUser && !hasSentFirstPayment) {
      setIsVisible(true);
    }
  }, [isNewUser, hasSentFirstPayment]);

  if (!isVisible) return null;

  const handleNext = () => {
    const steps: QuestStep[] = ['welcome', 'explain', 'guide', 'complete'];
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
            className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            {step === 'welcome' && (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                  <span className="text-3xl">👋</span>
                </div>
                <h2 className="mb-2 text-2xl font-bold text-gray-900">
                  Welcome to Plenmo!
                </h2>
                <p className="mb-6 text-gray-600">
                  Let&apos;s send your first payment in under 60 seconds.
                  No gas fees, no complicated addresses.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleSkip}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-gray-700 transition hover:bg-gray-50"
                  >
                    Skip for now
                  </button>
                  <button
                    onClick={handleNext}
                    className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3 font-semibold text-white transition hover:opacity-90"
                  >
                    Let&apos;s go!
                  </button>
                </div>
              </div>
            )}

            {step === 'explain' && (
              <div className="text-center">
                <div className="mb-6 grid grid-cols-3 gap-4">
                  <div className="rounded-xl bg-blue-50 p-4">
                    <div className="mb-2 text-2xl">🌍</div>
                    <p className="text-sm font-medium text-blue-900">Global</p>
                    <p className="text-xs text-blue-700">Send anywhere</p>
                  </div>
                  <div className="rounded-xl bg-green-50 p-4">
                    <div className="mb-2 text-2xl">⛽</div>
                    <p className="text-sm font-medium text-green-900">$0 Fees</p>
                    <p className="text-xs text-green-700">No gas ever</p>
                  </div>
                  <div className="rounded-xl bg-purple-50 p-4">
                    <div className="mb-2 text-2xl">⚡</div>
                    <p className="text-sm font-medium text-purple-900">Instant</p>
                    <p className="text-xs text-purple-700">Seconds, not days</p>
                  </div>
                </div>
                <h2 className="mb-2 text-xl font-bold text-gray-900">
                  Why Plenmo is Different
                </h2>
                <p className="mb-6 text-gray-600">
                  Unlike Venmo, we work globally. Unlike crypto wallets,
                  we&apos;re simple. You get the best of both worlds.
                </p>
                <button
                  onClick={handleNext}
                  className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3 font-semibold text-white transition hover:opacity-90"
                >
                  Got it! Show me how
                </button>
              </div>
            )}

            {step === 'guide' && (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-600">
                  <span className="text-3xl">💸</span>
                </div>
                <h2 className="mb-2 text-xl font-bold text-gray-900">
                  Ready to Send?
                </h2>
                <p className="mb-4 text-gray-600">
                  Try sending $1 to a friend or family member.
                  Watch how fast and free it is!
                </p>
                <div className="mb-6 rounded-lg bg-gray-50 p-4 text-left">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-sm text-white">1</span>
                    <span className="text-gray-700">Tap the &quot;Send&quot; button</span>
                  </div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-sm text-white">2</span>
                    <span className="text-gray-700">Enter recipient&apos;s username or email</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-sm text-white">3</span>
                    <span className="text-gray-700">Enter amount and confirm</span>
                  </div>
                </div>
                <button
                  onClick={handleNext}
                  className="w-full rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3 font-semibold text-white transition hover:opacity-90"
                >
                  Start Sending
                </button>
              </div>
            )}

            {step === 'complete' && (
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', duration: 0.5 }}
                  className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-600"
                >
                  <span className="text-4xl">🎉</span>
                </motion.div>
                <h2 className="mb-2 text-2xl font-bold text-gray-900">
                  You&apos;re All Set!
                </h2>
                <p className="mb-6 text-gray-600">
                  You&apos;re ready to send and receive money globally,
                  instantly, and with zero fees.
                </p>
                <button
                  onClick={() => {
                    onComplete();
                    setIsVisible(false);
                  }}
                  className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3 font-semibold text-white transition hover:opacity-90"
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
