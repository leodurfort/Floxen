'use client';

import clsx from 'clsx';

interface ScoreOverviewProps {
  score: {
    overall: number;
    grade: 'Excellent' | 'Good' | 'Needs Work' | 'Poor';
    errorCount: number;
    warningCount: number;
    passedCount: number;
    totalFieldsChecked: number;
  };
}

const GRADE_CONFIG = {
  Excellent: { color: '#16a34a', label: 'Excellent' },
  Good: { color: '#2563eb', label: 'Good' },
  'Needs Work': { color: '#d97706', label: 'Needs Work' },
  Poor: { color: '#dc2626', label: 'Poor' },
} as const;

const CIRCUMFERENCE = 2 * Math.PI * 45; // ~282.74

export function ScoreOverview({ score }: ScoreOverviewProps) {
  const { overall, grade, errorCount, warningCount, passedCount } = score;
  const config = GRADE_CONFIG[grade];
  const offset = CIRCUMFERENCE - (overall / 100) * CIRCUMFERENCE;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
      {/* Score Circle */}
      <div className="flex justify-center">
        <div className="relative w-40 h-40 md:w-48 md:h-48">
          <svg
            className="w-full h-full -rotate-90"
            viewBox="0 0 100 100"
            aria-label={`Score: ${overall}% - ${grade}`}
          >
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="8"
            />
            {/* Score circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={config.color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              style={{
                animation: 'scoreReveal 1s ease-out forwards',
              }}
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="flex items-baseline">
              <span className="font-display font-bold text-4xl md:text-5xl text-gray-900">
                {overall}
              </span>
              <span className="text-lg md:text-xl text-gray-500 ml-0.5">%</span>
            </div>
            <span
              className="text-sm font-semibold mt-1"
              style={{ color: config.color }}
            >
              {config.label}
            </span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        {/* Errors */}
        <div className="text-center p-3 rounded-xl bg-red-50">
          <div className="flex items-center justify-center gap-1.5">
            <svg
              className="w-4 h-4 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-2xl font-bold text-red-700">
              {errorCount}
            </span>
          </div>
          <p className="text-xs text-red-600 mt-1 font-medium">Errors</p>
        </div>

        {/* Warnings */}
        <div className="text-center p-3 rounded-xl bg-amber-50">
          <div className="flex items-center justify-center gap-1.5">
            <svg
              className="w-4 h-4 text-amber-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="text-2xl font-bold text-amber-700">
              {warningCount}
            </span>
          </div>
          <p className="text-xs text-amber-600 mt-1 font-medium">Warnings</p>
        </div>

        {/* Passed */}
        <div className="text-center p-3 rounded-xl bg-green-50">
          <div className="flex items-center justify-center gap-1.5">
            <svg
              className="w-4 h-4 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-2xl font-bold text-green-700">
              {passedCount}
            </span>
          </div>
          <p className="text-xs text-green-600 mt-1 font-medium">Passed</p>
        </div>
      </div>
    </div>
  );
}
