'use client';

import { useState, useCallback, useRef } from 'react';
import { UrlInputForm } from './UrlInputForm';
import { AnalysisProgress } from './AnalysisProgress';
import { ScoreOverview } from './ScoreOverview';
import { ProductPreview } from './ProductPreview';
import { SeoSignals } from './SeoSignals';
import { CategoryBreakdown } from './CategoryBreakdown';
import { ResultSection } from './ResultSection';
import { NoDataFound } from './NoDataFound';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnalysisData {
  url: string;
  analyzedAt: string;
  noDataFound: boolean;
  score: {
    overall: number;
    grade: 'Excellent' | 'Good' | 'Needs Work' | 'Poor';
    errorCount: number;
    warningCount: number;
    passedCount: number;
    totalFieldsChecked: number;
  };
  product: {
    title: string | null;
    image: string | null;
    price: string | null;
    availability: string | null;
    brand: string | null;
    url: string;
  };
  categories: Array<{
    key: string;
    label: string;
    order: number;
    score: number;
    fields: Array<{
      attribute: string;
      requirement: string;
      status: 'pass' | 'error' | 'warning' | 'missing';
      value: any;
      message: string | null;
      description: string;
    }>;
  }>;
  errors: Array<{ field: string; message: string; category: string }>;
  warnings: Array<{ field: string; message: string; category: string }>;
  passed: Array<{ field: string; category: string; value: any }>;
  seoSignals: {
    hasJsonLd: boolean;
    hasOpenGraph: boolean;
    hasMicrodata: boolean;
    hasCanonicalUrl: boolean;
    hasMetaDescription: boolean;
    hasH1: boolean;
    isHttps: boolean;
  };
  extraction: {
    sources: string[];
    fieldsExtracted: number;
    fieldsTotal: number;
  };
}

type ViewState = 'idle' | 'loading' | 'results' | 'error';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VisibilityCheckerTool() {
  const [viewState, setViewState] = useState<ViewState>('idle');
  const [result, setResult] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleSubmit = useCallback(async (url: string) => {
    setViewState('loading');
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error?.message || `Analysis failed (${response.status})`
        );
      }

      setResult(data.data);
      setViewState('results');

      // Scroll to results after a short delay to allow render
      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(message);
      setViewState('error');
    }
  }, []);

  const handleTestAnother = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div>
      {/* Form — always visible */}
      <section className="tool-section">
        <div className="tool-container">
          <UrlInputForm
            onSubmit={handleSubmit}
            isLoading={viewState === 'loading'}
            error={viewState === 'error' ? error : null}
          />
        </div>
      </section>

      {/* Loading state */}
      {viewState === 'loading' && (
        <section className="tool-section pt-0">
          <div className="tool-container">
            <AnalysisProgress isActive />
          </div>
        </section>
      )}

      {/* Results */}
      {viewState === 'results' && result && (
        <div ref={resultsRef}>
          <section className="tool-section pt-0">
            <div className="tool-container space-y-6">
              {result.noDataFound ? (
                <NoDataFound url={result.url} />
              ) : (
                <>
                  {/* Product Preview */}
                  <ProductPreview product={result.product} />

                  {/* Score Overview */}
                  <ScoreOverview score={result.score} />

                  {/* SEO Signals */}
                  <SeoSignals signals={result.seoSignals} />

                  {/* Category Breakdown */}
                  <CategoryBreakdown categories={result.categories} />

                  {/* Error / Warning / Passed sections */}
                  {result.errors.length > 0 && (
                    <ResultSection
                      title="Errors"
                      items={result.errors}
                      variant="error"
                      defaultOpen
                    />
                  )}

                  {result.warnings.length > 0 && (
                    <ResultSection
                      title="Warnings"
                      items={result.warnings}
                      variant="warning"
                    />
                  )}

                  {result.passed.length > 0 && (
                    <ResultSection
                      title="Passed"
                      items={result.passed}
                      variant="success"
                    />
                  )}
                </>
              )}

              {/* Test another */}
              <div className="flex justify-center pt-4">
                <button
                  type="button"
                  onClick={handleTestAnother}
                  className="btn--outline"
                >
                  Test Another Product
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
