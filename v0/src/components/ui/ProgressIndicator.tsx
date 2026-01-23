"use client";

import { motion } from "framer-motion";

type Step = {
  id: number;
  label: string;
  status: "pending" | "active" | "complete" | "error";
};

type Props = {
  steps: Step[];
  currentStep: number;
};

export function ProgressIndicator({ steps, currentStep }: Props) {
  return (
    <div className="xui-progress">
      <div className="xui-progress-bar">
        {steps.map((step, index) => (
          <div key={step.id} className="xui-progress-step">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: step.status === "active" ? 1.1 : 1, 
                opacity: 1 
              }}
              transition={{ duration: 0.2 }}
              className={`xui-progress-dot ${step.status}`}
            >
              {step.status === "complete" ? "✓" : step.id}
            </motion.div>
            <span className="xui-progress-label">{step.label}</span>
            {index < steps.length - 1 && (
              <div className={`xui-progress-line ${step.status === "complete" ? "complete" : ""}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProgressIndicator;
