'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ZKP2POnramp } from './ZKP2POnramp';

interface AddFundsButtonProps {
  recipientAddress: string;
  variant?: 'primary' | 'secondary' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  useModal?: boolean;
  onSuccess?: (txHash: string) => void;
}

export function AddFundsButton({
  recipientAddress,
  variant = 'primary',
  size = 'md',
  className = '',
  useModal = true,
  onSuccess,
}: AddFundsButtonProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  const handleClick = () => {
    if (useModal) {
      setShowModal(true);
    } else {
      router.push('/add-funds');
    }
  };

  const handleSuccess = (txHash: string) => {
    onSuccess?.(txHash);
    setShowModal(false);
  };

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3.5 text-lg',
  };

  // Variant classes
  const variantClasses = {
    primary: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:opacity-90',
    secondary: 'bg-white border-2 border-green-500 text-green-600 hover:bg-green-50',
    minimal: 'text-green-600 hover:text-green-700 hover:bg-green-50',
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={`
          flex items-center justify-center gap-2 rounded-xl font-semibold transition
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          ${className}
        `}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <span>Add Funds</span>
      </button>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowModal(false);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md"
            >
              <ZKP2POnramp
                recipientAddress={recipientAddress}
                onSuccess={handleSuccess}
                onClose={() => setShowModal(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default AddFundsButton;
