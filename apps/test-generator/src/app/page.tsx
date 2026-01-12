'use client';

import { useState, useEffect } from 'react';

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'generating' | 'complete' | 'error' | 'cleaning';

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
}

export default function Home() {
  const [state, setState] = useState<ConnectionState>('disconnected');
  const [storeUrl, setStoreUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        setState('connected');
        setStoreUrl(data.storeUrl || '');
        setStoreInfo(data.storeInfo || null);
      }
    } catch {
      // Not connected
    }
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
            ) : state === 'connected' ? (
              <ConnectedState
                storeUrl={storeUrl}
                storeInfo={storeInfo}
                onDisconnect={handleDisconnect}
                onGenerate={() => setState('generating')}
                onCleanup={() => setState('cleaning')}
              />
            ) : state === 'generating' ? (
              <GeneratingState
                onComplete={() => setState('complete')}
                onError={(msg) => {
                  setError(msg);
                  setState('error');
                }}
              />
            ) : state === 'complete' ? (
              <CompleteState
                storeUrl={storeUrl}
                onCleanup={() => setState('cleaning')}
                onDisconnect={handleDisconnect}
              />
            ) : state === 'cleaning' ? (
              <CleaningState
                onComplete={() => setState('connected')}
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
                  setState('connected');
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

// Connected State Component
function ConnectedState({
  storeUrl,
  storeInfo,
  onDisconnect,
  onGenerate,
  onCleanup,
}: {
  storeUrl: string;
  storeInfo: StoreInfo | null;
  onDisconnect: () => void;
  onGenerate: () => void;
  onCleanup: () => void;
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

      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
        <p className="text-sm text-amber-800">
          <strong>~500 products</strong> will be generated including categories, simple products, variable products with variations, and grouped products.
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
  onComplete,
  onError,
}: {
  onComplete: () => void;
  onError: (msg: string) => void;
}) {
  const [progress, setProgress] = useState({ phase: 'Starting...', current: 0, total: 0, message: '' });

  useEffect(() => {
    const eventSource = new EventSource('/api/generate');

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
  onCleanup,
  onDisconnect,
}: {
  storeUrl: string;
  onCleanup: () => void;
  onDisconnect: () => void;
}) {
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
        All test products have been created in your WooCommerce store.
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
  onComplete,
  onError,
}: {
  onComplete: () => void;
  onError: (msg: string) => void;
}) {
  const [progress, setProgress] = useState({ phase: 'Finding products...', current: 0, total: 0 });

  useEffect(() => {
    const eventSource = new EventSource('/api/cleanup');

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
