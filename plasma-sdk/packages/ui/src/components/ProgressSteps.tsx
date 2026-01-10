"use client";

import { Check, Loader2 } from "lucide-react";

export interface Step {
  id: string;
  label: string;
  description?: string;
}

export interface ProgressStepsProps {
  steps: Step[];
  currentStep: number;
  variant?: "horizontal" | "vertical";
}

export function ProgressSteps({
  steps,
  currentStep,
  variant = "horizontal",
}: ProgressStepsProps) {
  if (variant === "vertical") {
    return (
      <div className="space-y-4">
        {steps.map((step, index) => {
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <div key={step.id} className="flex gap-4">
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isComplete
                      ? "bg-green-500 text-white"
                      : isCurrent
                      ? "bg-[rgb(0,212,255)] text-black animate-pulse-glow"
                      : "bg-white/10 text-white/40"
                  }`}
                >
                  {isComplete ? (
                    <Check className="w-4 h-4" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span className="text-sm">{index + 1}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-0.5 h-8 transition-colors duration-300 ${
                      isComplete ? "bg-green-500" : "bg-white/10"
                    }`}
                  />
                )}
              </div>

              {/* Step content */}
              <div className="pb-8">
                <p
                  className={`font-medium transition-colors duration-300 ${
                    isComplete
                      ? "text-green-400"
                      : isCurrent
                      ? "text-white"
                      : "text-white/40"
                  }`}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-sm text-white/40 mt-1">{step.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Horizontal variant
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => {
        const isComplete = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isComplete
                    ? "bg-green-500 text-white"
                    : isCurrent
                    ? "bg-[rgb(0,212,255)] text-black"
                    : "bg-white/10 text-white/40"
                }`}
              >
                {isComplete ? (
                  <Check className="w-5 h-5" />
                ) : isCurrent ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <p
                className={`mt-2 text-xs font-medium text-center ${
                  isComplete
                    ? "text-green-400"
                    : isCurrent
                    ? "text-white"
                    : "text-white/40"
                }`}
              >
                {step.label}
              </p>
            </div>

            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 transition-colors duration-300 ${
                  isComplete ? "bg-green-500" : "bg-white/10"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Simplified scan progress for SubKiller/Bill Split
export interface ScanProgressProps {
  stage: "connecting" | "fetching" | "analyzing" | "complete";
  progress: number;
  label?: string;
}

export function ScanProgress({ stage, progress, label }: ScanProgressProps) {
  const stages = [
    { id: "connecting", label: "Connecting" },
    { id: "fetching", label: "Fetching Data" },
    { id: "analyzing", label: "Analyzing" },
    { id: "complete", label: "Complete" },
  ];

  const currentIndex = stages.findIndex((s) => s.id === stage);

  return (
    <div className="space-y-4">
      <ProgressSteps steps={stages} currentStep={currentIndex} variant="horizontal" />
      
      {/* Progress bar */}
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[rgb(0,212,255)] to-purple-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {label && (
        <p className="text-center text-white/50 text-sm animate-pulse">
          {label}
        </p>
      )}
    </div>
  );
}
