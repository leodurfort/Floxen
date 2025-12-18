'use client';

import { useState } from 'react';

export default function TestUnitsPage() {
  const [shopId, setShopId] = useState('');
  const [apiUrl, setApiUrl] = useState('https://api-production-6a74.up.railway.app');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testUnits = async () => {
    if (!shopId) {
      setError('Please enter a Shop ID');
      return;
    }

    if (!apiUrl) {
      setError('Please enter an API URL');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${apiUrl}/api/v1/shops/${shopId}`, {
        method: 'GET',
        headers: headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🧪 Store Units Test
            </h1>
            <p className="text-gray-600">
              Test retrieval of WooCommerce dimension and weight units
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="shopId" className="block text-sm font-medium text-gray-700 mb-1">
                Shop ID
              </label>
              <input
                type="text"
                id="shopId"
                value={shopId}
                onChange={(e) => setShopId(e.target.value)}
                placeholder="Enter shop ID (e.g., cmj4zusz40000mians1w67n03)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="apiUrl" className="block text-sm font-medium text-gray-700 mb-1">
                API URL
              </label>
              <input
                type="text"
                id="apiUrl"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://api-production-6a74.up.railway.app"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-1">
                Access Token (optional)
              </label>
              <input
                type="text"
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Your JWT token if auth is required"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <button
            onClick={testUnits}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
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
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Testing...
              </span>
            ) : (
              'Test Store Units'
            )}
          </button>

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-md p-4">
              <h3 className="text-red-800 font-semibold mb-2">❌ Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {result && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-md p-4">
              <h3 className="text-green-800 font-semibold mb-4">
                ✅ Successfully Retrieved Store Units
              </h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white bg-opacity-70 rounded-md p-4">
                  <div className="text-xs uppercase text-gray-600 mb-1">
                    Dimension Unit
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {result.dimensionUnit || 'Not set'}
                  </div>
                </div>

                <div className="bg-white bg-opacity-70 rounded-md p-4">
                  <div className="text-xs uppercase text-gray-600 mb-1">
                    Weight Unit
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {result.weightUnit || 'Not set'}
                  </div>
                </div>
              </div>

              <details className="mt-4">
                <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                  View Full Shop Response
                </summary>
                <pre className="mt-2 bg-gray-900 text-green-400 p-4 rounded-md overflow-x-auto text-sm">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
