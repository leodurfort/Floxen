'use client';

import { useState, useCallback, type FormEvent } from 'react';
import clsx from 'clsx';

interface UrlInputFormProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
  error: string | null;
}

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function UrlInputForm({ onSubmit, isLoading, error }: UrlInputFormProps) {
  const [inputValue, setInputValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const displayError = error || validationError;

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setValidationError(null);

      const normalized = normalizeUrl(inputValue);

      if (!normalized) {
        setValidationError('Please enter a product page URL.');
        return;
      }

      if (!isValidUrl(normalized)) {
        setValidationError(
          'Please enter a valid URL (e.g., https://example.com/product).'
        );
        return;
      }

      onSubmit(normalized);
    },
    [inputValue, onSubmit]
  );

  return (
    <div className="text-center max-w-3xl mx-auto">
      <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight">
        Is Your Product Ready for{' '}
        <span className="text-landing-primary">ChatGPT Shopping</span>?
      </h1>

      <p className="mt-4 text-gray-600 text-lg md:text-xl max-w-2xl mx-auto">
        Free instant analysis against OpenAI&apos;s 70-field commerce
        specification.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto"
        noValidate
      >
        <div className="flex-1">
          <label htmlFor="product-url" className="sr-only">
            Product page URL
          </label>
          <input
            id="product-url"
            type="url"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setValidationError(null);
            }}
            placeholder="Enter your product page URL..."
            disabled={isLoading}
            autoComplete="url"
            className={clsx(
              'w-full text-base sm:text-lg py-3.5 px-4',
              displayError && 'border-red-400 focus:border-red-500 focus:ring-red-200'
            )}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn--primary whitespace-nowrap px-8 py-3.5 text-base sm:text-lg"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg
                className="spinner w-5 h-5"
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
              Analyzing...
            </span>
          ) : (
            'Analyze'
          )}
        </button>
      </form>

      {displayError && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {displayError}
        </p>
      )}
    </div>
  );
}
