'use client';

import { useState, useEffect } from 'react';
import clsx from 'clsx';

interface AnalysisProgressProps {
  isActive: boolean;
}

const STEPS = [
  { label: 'Fetching page...', delay: 0 },
  { label: 'Extracting structured data...', delay: 1500 },
  { label: 'Validating against OpenAI spec...', delay: 3000 },
  { label: 'Computing readiness score...', delay: 4500 },
] as const;

export function AnalysisProgress({ isActive }: AnalysisProgressProps) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setActiveStep(0);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    STEPS.forEach((step, index) => {
      if (index === 0) return; // First step is immediate
      const timer = setTimeout(() => {
        setActiveStep(index);
      }, step.delay);
      timers.push(timer);
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="max-w-md mx-auto py-12" role="status" aria-label="Analyzing product page">
      <div className="space-y-0">
        {STEPS.map((step, index) => {
          const isCompleted = index < activeStep;
          const isCurrent = index === activeStep;
          const isPending = index > activeStep;

          return (
            <div key={step.label} className="flex items-start gap-3">
              {/* Vertical line and icon column */}
              <div className="flex flex-col items-center">
                {/* Icon */}
                <div
                  className={clsx(
                    'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
                    isCompleted && 'bg-green-100',
                    isCurrent && 'bg-accent/10',
                    isPending && 'bg-gray-100'
                  )}
                >
                  {isCompleted && (
                    <svg
                      className="w-4 h-4 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                  {isCurrent && (
                    <svg
                      className="spinner w-4 h-4 text-accent"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  )}
                  {isPending && (
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                  )}
                </div>

                {/* Connecting line */}
                {index < STEPS.length - 1 && (
                  <div
                    className={clsx(
                      'w-0.5 h-6',
                      isCompleted ? 'bg-green-200' : 'bg-gray-200'
                    )}
                  />
                )}
              </div>

              {/* Label */}
              <span
                className={clsx(
                  'text-sm pt-1',
                  isCompleted && 'text-green-700',
                  isCurrent && 'text-gray-900 font-medium',
                  isPending && 'text-gray-400'
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
