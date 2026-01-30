'use client';

import clsx from 'clsx';

interface SeoSignalsProps {
  signals: {
    hasJsonLd: boolean;
    hasOpenGraph: boolean;
    hasMicrodata: boolean;
    hasCanonicalUrl: boolean;
    hasMetaDescription: boolean;
    hasH1: boolean;
    isHttps: boolean;
  };
}

interface Signal {
  key: keyof SeoSignalsProps['signals'];
  label: string;
}

const SIGNALS: Signal[] = [
  { key: 'hasJsonLd', label: 'JSON-LD' },
  { key: 'hasOpenGraph', label: 'Open Graph' },
  { key: 'hasMicrodata', label: 'Microdata' },
  { key: 'isHttps', label: 'HTTPS' },
  { key: 'hasCanonicalUrl', label: 'Canonical URL' },
  { key: 'hasMetaDescription', label: 'Meta Description' },
  { key: 'hasH1', label: 'H1 Tag' },
];

function CheckIcon() {
  return (
    <svg
      className="w-4 h-4 text-green-600 flex-shrink-0"
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
  );
}

function XIcon() {
  return (
    <svg
      className="w-4 h-4 text-gray-400 flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

export function SeoSignals({ signals }: SeoSignalsProps) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        SEO Signals Detected
      </h3>
      <div className="flex flex-wrap gap-3">
        {SIGNALS.map((signal) => {
          const isPresent = signals[signal.key];
          return (
            <div
              key={signal.key}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm',
                isPresent
                  ? 'bg-green-50 text-green-700'
                  : 'bg-gray-100 text-gray-400'
              )}
            >
              {isPresent ? <CheckIcon /> : <XIcon />}
              <span className="font-medium">{signal.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
