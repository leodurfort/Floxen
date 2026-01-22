'use client';

import { useState, useEffect } from 'react';
import {
  ValidationResult,
  ValidationCategory,
  ValidationStatus,
  MissingItems,
} from '@/types/validation';
import { FeedType, FEED_CONFIGS } from '@/types/feed';

type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'selecting-feed'
  | 'connected'
  | 'validating'
  | 'generating'
  | 'complete'
  | 'cleaning'
  | 'fixing'
  | 'error';

interface StoreInfo {
  currency: string;
  dimensionUnit: string;
  weightUnit: string;
}

interface StatusResponse {
  connected: boolean;
  storeUrl?: string;
  storeInfo?: StoreInfo;
  connectedAt?: number;
  feedType?: FeedType;
}

export default function Home() {
  const [state, setState] = useState<ConnectionState>('disconnected');
  const [storeUrl, setStoreUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [feedType, setFeedType] = useState<FeedType>('comprehensive');

  // Check connection status on mount
  useEffect(() => {
    checkStatus();

    // Check URL params for OAuth callback
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'true') {
      checkStatus();
      window.history.replaceState({}, '', '/');
    }
    if (params.get('error')) {
      setError(params.get('error') || 'Connection failed');
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data: StatusResponse = await res.json();
      if (data.connected) {
        setStoreUrl(data.storeUrl || '');
        setStoreInfo(data.storeInfo || null);
        // Show feed selector instead of auto-validating
        setState('selecting-feed');
        if (data.feedType) {
          setFeedType(data.feedType);
        }
      }
    } catch {
      // Not connected
    }
  };

  const handleFeedSelect = async (selectedFeed: FeedType) => {
    setFeedType(selectedFeed);
    // Save feed type to session
    await fetch('/api/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedType: selectedFeed }),
    });
    setState('validating');
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setState('connecting');

    try {
      const res = await fetch('/api/oauth/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeUrl: inputUrl }),
      });

      const data = await res.json();
      if (data.success && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setError(data.error?.message || 'Failed to initiate connection');
        setState('disconnected');
      }
    } catch {
      setError('Failed to connect. Please try again.');
      setState('disconnected');
    }
  };

  const handleDisconnect = async () => {
    await fetch('/api/oauth/disconnect', { method: 'POST' });
    setState('disconnected');
    setStoreUrl('');
    setStoreInfo(null);
    setInputUrl('');
    setValidationResult(null);
  };

  const handleValidationComplete = (result: ValidationResult) => {
    setValidationResult(result);
    setState('connected');
  };

  const handleRevalidate = () => {
    setValidationResult(null);
    setState('validating');
  };

  const handleFix = () => {
    if (validationResult?.missingItems) {
      setState('fixing');
    }
  };

  const handleFixComplete = () => {
    // Re-validate after fix
    setValidationResult(null);
    setState('validating');
  };

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-surface-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-display font-semibold text-text-primary">
            WooCommerce Test Data Generator
          </h1>
          <span className="text-sm text-text-muted">ProductSync Tool</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-surface-card rounded-lg shadow-sm border border-border p-6">
            {state === 'disconnected' || state === 'connecting' ? (
              <ConnectForm
                inputUrl={inputUrl}
                setInputUrl={setInputUrl}
                onSubmit={handleConnect}
                isLoading={state === 'connecting'}
                error={error}
              />
            ) : state === 'selecting-feed' ? (
              <FeedSelector
                storeUrl={storeUrl}
                storeInfo={storeInfo}
                selectedFeed={feedType}
                onSelect={handleFeedSelect}
                onDisconnect={handleDisconnect}
              />
            ) : state === 'validating' ? (
              <ValidatingState
                feedType={feedType}
                onComplete={handleValidationComplete}
                onError={(msg) => {
                  setError(msg);
                  setState('error');
                }}
              />
            ) : state === 'connected' ? (
              <ConnectedState
                storeUrl={storeUrl}
                storeInfo={storeInfo}
                feedType={feedType}
                validationResult={validationResult}
                onDisconnect={handleDisconnect}
                onGenerate={() => setState('generating')}
                onCleanup={() => setState('cleaning')}
                onRevalidate={handleRevalidate}
                onFix={handleFix}
                onChangeFeed={() => setState('selecting-feed')}
              />
            ) : state === 'generating' ? (
              <GeneratingState
                feedType={feedType}
                onComplete={() => setState('complete')}
                onError={(msg) => {
                  setError(msg);
                  setState('error');
                }}
              />
            ) : state === 'complete' ? (
              <CompleteState
                storeUrl={storeUrl}
                feedType={feedType}
                onCleanup={() => setState('cleaning')}
                onDisconnect={handleDisconnect}
              />
            ) : state === 'cleaning' ? (
              <CleaningState
                feedType={feedType}
                onComplete={handleRevalidate}
                onError={(msg) => {
                  setError(msg);
                  setState('error');
                }}
              />
            ) : state === 'fixing' ? (
              <FixingState
                feedType={feedType}
                missingItems={validationResult?.missingItems || null}
                onComplete={handleFixComplete}
                onError={(msg) => {
                  setError(msg);
                  setState('error');
                }}
              />
            ) : state === 'error' ? (
              <ErrorState
                error={error}
                onRetry={() => {
                  setError(null);
                  setState('selecting-feed');
                }}
              />
            ) : null}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-surface-card">
        <div className="max-w-4xl mx-auto px-4 py-3 text-center text-sm text-text-muted">
          Part of ProductSync - Sync your products across platforms
        </div>
      </footer>
    </main>
  );
}

// Connect Form Component
function ConnectForm({
  inputUrl,
  setInputUrl,
  onSubmit,
  isLoading,
  error,
}: {
  inputUrl: string;
  setInputUrl: (url: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  error: string | null;
}) {
  return (
    <form onSubmit={onSubmit}>
      <h2 className="text-lg font-semibold mb-2">Connect Your Store</h2>
      <p className="text-text-secondary text-sm mb-4">
        Enter your WooCommerce store URL to generate test products.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="storeUrl" className="block text-sm font-medium mb-1">
          Store URL
        </label>
        <input
          id="storeUrl"
          type="url"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          placeholder="https://your-store.com"
          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          required
          disabled={isLoading}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-accent hover:bg-accent-hover text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Connecting...' : 'Connect Store'}
      </button>

      <p className="mt-4 text-xs text-text-muted text-center">
        You will be redirected to your WooCommerce store to authorize access.
      </p>
    </form>
  );
}

// Feed Selector Component
function FeedSelector({
  storeUrl,
  storeInfo,
  selectedFeed,
  onSelect,
  onDisconnect,
}: {
  storeUrl: string;
  storeInfo: StoreInfo | null;
  selectedFeed: FeedType;
  onSelect: (feed: FeedType) => void;
  onDisconnect: () => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 bg-success rounded-full" />
        <h2 className="text-lg font-semibold">Connected</h2>
      </div>

      <div className="mb-4 p-3 bg-surface-bg rounded-md">
        <p className="text-sm text-text-secondary">Store</p>
        <p className="font-medium truncate">{storeUrl}</p>
        {storeInfo && (
          <p className="text-xs text-text-muted mt-1">
            {storeInfo.currency} | {storeInfo.weightUnit} | {storeInfo.dimensionUnit}
          </p>
        )}
      </div>

      <h3 className="text-md font-semibold mb-3">Select Feed Type</h3>

      <div className="space-y-3 mb-4">
        {(Object.keys(FEED_CONFIGS) as FeedType[]).map((feedId) => {
          const config = FEED_CONFIGS[feedId];
          const isSelected = selectedFeed === feedId;
          return (
            <button
              key={feedId}
              onClick={() => onSelect(feedId)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'border-accent bg-accent/5'
                  : 'border-border hover:border-accent/50 bg-surface-bg'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text-primary">{config.name}</span>
                    {feedId === 'winter-sports' && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary mt-1">{config.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="px-2 py-0.5 text-xs bg-surface-card border border-border rounded">
                      {config.productCount} products
                    </span>
                    {config.categories.slice(0, 3).map((cat) => (
                      <span
                        key={cat}
                        className="px-2 py-0.5 text-xs bg-surface-card border border-border rounded"
                      >
                        {cat}
                      </span>
                    ))}
                    {config.categories.length > 3 && (
                      <span className="px-2 py-0.5 text-xs bg-surface-card border border-border rounded">
                        +{config.categories.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-3 ${
                    isSelected ? 'border-accent bg-accent' : 'border-border'
                  }`}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              {isSelected && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs font-medium text-text-secondary mb-1">Features:</p>
                  <ul className="text-xs text-text-muted space-y-0.5">
                    {config.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-1">
                        <span className="text-success">✓</span> {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={onDisconnect}
        className="w-full text-text-muted hover:text-text-secondary font-medium py-2 px-4 transition-colors"
      >
        Disconnect
      </button>
    </div>
  );
}

// Connected State Component
function ConnectedState({
  storeUrl,
  storeInfo,
  feedType,
  validationResult,
  onDisconnect,
  onGenerate,
  onCleanup,
  onRevalidate,
  onFix,
  onChangeFeed,
}: {
  storeUrl: string;
  storeInfo: StoreInfo | null;
  feedType: FeedType;
  validationResult: ValidationResult | null;
  onDisconnect: () => void;
  onGenerate: () => void;
  onCleanup: () => void;
  onRevalidate: () => void;
  onFix: () => void;
  onChangeFeed: () => void;
}) {
  const feedConfig = FEED_CONFIGS[feedType];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 bg-success rounded-full" />
        <h2 className="text-lg font-semibold">Connected</h2>
      </div>

      <div className="mb-4 p-3 bg-surface-bg rounded-md">
        <p className="text-sm text-text-secondary">Store</p>
        <p className="font-medium truncate">{storeUrl}</p>
        {storeInfo && (
          <p className="text-xs text-text-muted mt-1">
            {storeInfo.currency} | {storeInfo.weightUnit} | {storeInfo.dimensionUnit}
          </p>
        )}
      </div>

      {/* Feed Type Info */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-800">{feedConfig.name}</p>
            <p className="text-xs text-blue-600">{feedConfig.productCount} products</p>
          </div>
          <button
            onClick={onChangeFeed}
            className="text-xs text-blue-700 hover:text-blue-900 underline"
          >
            Change
          </button>
        </div>
      </div>

      {/* Validation Dashboard */}
      {validationResult && (
        <ValidationDashboard
          result={validationResult}
          onRevalidate={onRevalidate}
          onFix={onFix}
        />
      )}

      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
        <p className="text-sm text-amber-800">
          <strong>{feedConfig.productCount} products</strong> will be generated
          {feedType === 'comprehensive'
            ? ' including categories, simple products, variable products with variations, and grouped products.'
            : ' - simple products with all required feed fields.'}
        </p>
      </div>

      <div className="space-y-2">
        <button
          onClick={onGenerate}
          className="w-full bg-accent hover:bg-accent-hover text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          Generate Products
        </button>
        <button
          onClick={onCleanup}
          className="w-full bg-surface-bg hover:bg-border text-text-secondary font-medium py-2 px-4 rounded-md transition-colors"
        >
          Cleanup Previous Products
        </button>
        <button
          onClick={onDisconnect}
          className="w-full text-text-muted hover:text-text-secondary font-medium py-2 px-4 transition-colors"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}

// Generating State Component
function GeneratingState({
  feedType,
  onComplete,
  onError,
}: {
  feedType: FeedType;
  onComplete: () => void;
  onError: (msg: string) => void;
}) {
  const [progress, setProgress] = useState({ phase: 'Starting...', current: 0, total: 0, message: '' });

  useEffect(() => {
    const eventSource = new EventSource(`/api/generate?feedType=${feedType}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'progress') {
        setProgress({
          phase: data.phase,
          current: data.current,
          total: data.total,
          message: data.message,
        });
      } else if (data.type === 'complete') {
        eventSource.close();
        onComplete();
      } else if (data.type === 'error') {
        eventSource.close();
        onError(data.error?.message || 'Generation failed');
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      onError('Connection lost during generation');
    };

    return () => eventSource.close();
  }, [onComplete, onError]);

  const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Generating Products...</h2>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="capitalize">{progress.phase}</span>
          <span>{percentage}%</span>
        </div>
        <div className="w-full bg-border rounded-full h-2">
          <div
            className="bg-accent h-2 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <p className="text-sm text-text-secondary text-center">
        {progress.message || `${progress.current} / ${progress.total}`}
      </p>

      <p className="mt-4 text-xs text-text-muted text-center">
        Please do not close this page. This may take several minutes.
      </p>
    </div>
  );
}

// Complete State Component
function CompleteState({
  storeUrl,
  feedType,
  onCleanup,
  onDisconnect,
}: {
  storeUrl: string;
  feedType: FeedType;
  onCleanup: () => void;
  onDisconnect: () => void;
}) {
  const feedConfig = FEED_CONFIGS[feedType];
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 bg-success rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold">Generation Complete!</h2>
      </div>

      <p className="text-text-secondary mb-4">
        {feedConfig.productCount} {feedConfig.name.toLowerCase()} products have been created in your WooCommerce store.
      </p>

      <div className="space-y-2">
        <a
          href={`${storeUrl}/wp-admin/edit.php?post_type=product`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-accent hover:bg-accent-hover text-white font-medium py-2 px-4 rounded-md transition-colors text-center"
        >
          View Products in WooCommerce
        </a>
        <button
          onClick={onCleanup}
          className="w-full bg-surface-bg hover:bg-border text-text-secondary font-medium py-2 px-4 rounded-md transition-colors"
        >
          Cleanup Generated Products
        </button>
        <button
          onClick={onDisconnect}
          className="w-full text-text-muted hover:text-text-secondary font-medium py-2 px-4 transition-colors"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}

// Cleaning State Component
function CleaningState({
  feedType,
  onComplete,
  onError,
}: {
  feedType: FeedType;
  onComplete: () => void;
  onError: (msg: string) => void;
}) {
  const [progress, setProgress] = useState({ phase: 'Finding products...', current: 0, total: 0 });

  useEffect(() => {
    const eventSource = new EventSource(`/api/cleanup?feedType=${feedType}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'progress') {
        setProgress({
          phase: data.phase,
          current: data.current,
          total: data.total,
        });
      } else if (data.type === 'complete') {
        eventSource.close();
        onComplete();
      } else if (data.type === 'error') {
        eventSource.close();
        onError(data.error?.message || 'Cleanup failed');
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      onError('Connection lost during cleanup');
    };

    return () => eventSource.close();
  }, [onComplete, onError]);

  const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Cleaning Up...</h2>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="capitalize">{progress.phase}</span>
          <span>{percentage}%</span>
        </div>
        <div className="w-full bg-border rounded-full h-2">
          <div
            className="bg-error h-2 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <p className="text-sm text-text-secondary text-center">
        {progress.current} / {progress.total} items removed
      </p>
    </div>
  );
}

// Error State Component
function ErrorState({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 bg-error rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold">Error</h2>
      </div>

      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
        {error || 'An unexpected error occurred'}
      </div>

      <button
        onClick={onRetry}
        className="w-full bg-accent hover:bg-accent-hover text-white font-medium py-2 px-4 rounded-md transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}

// Validating State Component
function ValidatingState({
  feedType,
  onComplete,
  onError,
}: {
  feedType: FeedType;
  onComplete: (result: ValidationResult) => void;
  onError: (msg: string) => void;
}) {
  const [progress, setProgress] = useState({ phase: 'Initializing...', current: 0, total: 0, message: '' });

  useEffect(() => {
    const eventSource = new EventSource(`/api/validate?feedType=${feedType}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'progress') {
        setProgress({
          phase: data.phase,
          current: data.current,
          total: data.total,
          message: data.message,
        });
      } else if (data.type === 'complete') {
        eventSource.close();
        onComplete(data.result);
      } else if (data.type === 'error') {
        eventSource.close();
        onError(data.error?.message || 'Validation failed');
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      onError('Connection lost during validation');
    };

    return () => eventSource.close();
  }, [onComplete, onError]);

  const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Validating Store...</h2>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="capitalize">{progress.phase.replace(/-/g, ' ')}</span>
          <span>{percentage}%</span>
        </div>
        <div className="w-full bg-border rounded-full h-2">
          <div
            className="bg-accent h-2 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <p className="text-sm text-text-secondary text-center">
        {progress.message || 'Checking store data...'}
      </p>
    </div>
  );
}

// Validation Dashboard Component
function ValidationDashboard({
  result,
  onRevalidate,
  onFix,
}: {
  result: ValidationResult;
  onRevalidate: () => void;
  onFix: () => void;
}) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const hasMissingItems =
    result.missingItems.brands.length > 0 ||
    result.missingItems.categories.length > 0 ||
    result.missingItems.products.simple.length > 0 ||
    result.missingItems.products.variable.length > 0 ||
    result.missingItems.products.grouped.length > 0 ||
    result.missingItems.relationships.length > 0 ||
    result.missingItems.reviews.length > 0;

  const statusColors: Record<ValidationStatus, string> = {
    pass: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    fail: 'bg-red-100 text-red-800',
    skipped: 'bg-gray-100 text-gray-800',
  };

  const statusLabels: Record<ValidationStatus, string> = {
    pass: 'All Passed',
    warning: 'Warnings',
    fail: 'Issues Found',
    skipped: 'Skipped',
  };

  const categories = [
    { key: 'counts', data: result.categories.counts },
    { key: 'dataCompleteness', data: result.categories.dataCompleteness },
    { key: 'edgeCases', data: result.categories.edgeCases },
    { key: 'relationships', data: result.categories.relationships },
    { key: 'reviews', data: result.categories.reviews },
  ];

  return (
    <div className="mb-4 p-4 bg-surface-bg rounded-md border border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-text-primary">Store Validation</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[result.overallStatus]}`}>
          {statusLabels[result.overallStatus]}
        </span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
        <div className="text-center p-2 bg-green-50 rounded">
          <div className="font-bold text-green-700">{result.summary.passed}</div>
          <div className="text-green-600 text-xs">Passed</div>
        </div>
        <div className="text-center p-2 bg-yellow-50 rounded">
          <div className="font-bold text-yellow-700">{result.summary.warnings}</div>
          <div className="text-yellow-600 text-xs">Warnings</div>
        </div>
        <div className="text-center p-2 bg-red-50 rounded">
          <div className="font-bold text-red-700">{result.summary.failed}</div>
          <div className="text-red-600 text-xs">Failed</div>
        </div>
      </div>

      {/* Category breakdown - expandable */}
      <div className="space-y-1 mb-3">
        {categories.map(({ key, data }) => (
          <div key={key}>
            <button
              onClick={() => setExpandedCategory(expandedCategory === key ? null : key)}
              className="w-full flex items-center justify-between text-xs py-1.5 px-2 hover:bg-white rounded transition-colors"
            >
              <span className="flex items-center gap-1">
                <span className="text-text-muted">{expandedCategory === key ? '▼' : '▶'}</span>
                <span className="text-text-secondary">{data.name}</span>
              </span>
              <span className={data.status === 'pass' ? 'text-green-600' : data.status === 'warning' ? 'text-yellow-600' : data.status === 'fail' ? 'text-red-600' : 'text-gray-400'}>
                {data.status === 'pass' ? '✓' : data.status === 'warning' ? '⚠' : data.status === 'fail' ? '✕' : '-'} {data.passCount}/{data.checks.length}
              </span>
            </button>

            {/* Expanded checks */}
            {expandedCategory === key && (
              <div className="ml-4 mt-1 space-y-0.5 text-xs border-l-2 border-gray-200 pl-2">
                {data.checks.map((check, idx) => (
                  <div key={idx} className="flex items-center justify-between py-0.5">
                    <span className="text-text-muted truncate max-w-[180px]">{check.name}</span>
                    <span className={check.status === 'pass' ? 'text-green-600' : check.status === 'warning' ? 'text-yellow-600' : check.status === 'fail' ? 'text-red-600' : 'text-gray-400'}>
                      {check.actual}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onRevalidate}
          className="flex-1 text-sm bg-white hover:bg-gray-50 text-text-secondary py-1.5 px-3 rounded border border-border transition-colors"
        >
          Re-validate
        </button>
        {hasMissingItems && (
          <button
            onClick={onFix}
            className="flex-1 text-sm bg-accent hover:bg-accent-hover text-white py-1.5 px-3 rounded transition-colors"
          >
            Fix Missing Items
          </button>
        )}
      </div>
    </div>
  );
}

// Fixing State Component
function FixingState({
  feedType,
  missingItems,
  onComplete,
  onError,
}: {
  feedType: FeedType;
  missingItems: MissingItems | null;
  onComplete: () => void;
  onError: (msg: string) => void;
}) {
  const [progress, setProgress] = useState({ phase: 'Starting...', current: 0, total: 0, message: '' });

  useEffect(() => {
    if (!missingItems) {
      onError('No missing items to fix');
      return;
    }

    const controller = new AbortController();

    fetch('/api/fix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...missingItems, feedType }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'progress') {
                setProgress({
                  phase: data.phase,
                  current: data.current,
                  total: data.total,
                  message: data.message,
                });
              } else if (data.type === 'complete') {
                onComplete();
                return;
              } else if (data.type === 'error') {
                onError(data.error?.message || 'Fix failed');
                return;
              }
            }
          }
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          onError('Connection lost during fix');
        }
      });

    return () => controller.abort();
  }, [missingItems, onComplete, onError]);

  const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Fixing Missing Items...</h2>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="capitalize">{progress.phase.replace(/-/g, ' ')}</span>
          <span>{percentage}%</span>
        </div>
        <div className="w-full bg-border rounded-full h-2">
          <div
            className="bg-success h-2 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <p className="text-sm text-text-secondary text-center">
        {progress.message || `${progress.current} / ${progress.total}`}
      </p>

      <p className="mt-4 text-xs text-text-muted text-center">
        Please do not close this page.
      </p>
    </div>
  );
}
