'use client';

import { useState } from 'react';

interface Product {
  id: string;
  title: string;
  wooProductId: number;
}

interface PriceResult {
  productId: string;
  title: string;
  wooProductId: number;
  regularPrice: string | null;
  price: string | null;
  salePrice: string | null;
  status: 'success' | 'error';
  error?: string;
  rawData?: any;
}

export default function TestPricesPage() {
  const [shopId, setShopId] = useState('');
  const [apiUrl, setApiUrl] = useState('https://api-production-6a74.up.railway.app');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<PriceResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  const testPrices = async () => {
    if (!shopId) {
      setError('Please enter a Shop ID');
      return;
    }

    if (!apiUrl) {
      setError('Please enter an API URL');
      return;
    }

    if (!token) {
      setError('Please enter an Access Token');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setProgress({ current: 0, total: 0 });

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      // Step 1: Fetch all products
      let allProducts: Product[] = [];
      let page = 1;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        const response = await fetch(
          `${apiUrl}/api/v1/shops/${shopId}/products?page=${page}&limit=${limit}`,
          { headers }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        allProducts = [...allProducts, ...data.products];

        hasMore = data.products.length === limit;
        page++;
      }

      setProgress({ current: 0, total: allProducts.length });

      // Step 2: Fetch WooCommerce data for each product
      const priceResults: PriceResult[] = [];

      for (let i = 0; i < allProducts.length; i++) {
        const product = allProducts[i];
        setProgress({ current: i + 1, total: allProducts.length });

        try {
          const wooResponse = await fetch(
            `${apiUrl}/api/v1/shops/${shopId}/products/${product.id}/woo-data`,
            { headers }
          );

          if (!wooResponse.ok) {
            priceResults.push({
              productId: product.id,
              title: product.title,
              wooProductId: product.wooProductId,
              regularPrice: null,
              price: null,
              salePrice: null,
              status: 'error',
              error: `HTTP ${wooResponse.status}`,
            });
            continue;
          }

          const wooData = await wooResponse.json();
          const rawWoo = wooData.wooData || {};

          priceResults.push({
            productId: product.id,
            title: product.title,
            wooProductId: product.wooProductId,
            regularPrice: rawWoo.regular_price ?? null,
            price: rawWoo.price ?? null,
            salePrice: rawWoo.sale_price ?? null,
            status: 'success',
            rawData: rawWoo,
          });
        } catch (err: any) {
          priceResults.push({
            productId: product.id,
            title: product.title,
            wooProductId: product.wooProductId,
            regularPrice: null,
            price: null,
            salePrice: null,
            status: 'error',
            error: err.message,
          });
        }

        // Update results in batches for better UX
        if (i % 10 === 0 || i === allProducts.length - 1) {
          setResults([...priceResults]);
        }
      }

      setResults(priceResults);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const successResults = results.filter((r) => r.status === 'success');
  const errorResults = results.filter((r) => r.status === 'error');
  const withRegularPrice = successResults.filter((r) => r.regularPrice && r.regularPrice !== '');
  const withoutRegularPrice = successResults.filter((r) => !r.regularPrice || r.regularPrice === '');

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Test WooCommerce regular_price
            </h1>
            <p className="text-gray-600">
              Test regular_price values for all catalog products
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
                Access Token (required)
              </label>
              <input
                type="text"
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Your JWT token"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <button
            onClick={testPrices}
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
                Testing... ({progress.current}/{progress.total})
              </span>
            ) : (
              'Test All Product Prices'
            )}
          </button>

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-md p-4">
              <h3 className="text-red-800 font-semibold mb-2">Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="mt-8">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="text-xs uppercase text-blue-600 mb-1">Total Products</div>
                  <div className="text-2xl font-bold text-blue-900">{results.length}</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="text-xs uppercase text-green-600 mb-1">With regular_price</div>
                  <div className="text-2xl font-bold text-green-900">{withRegularPrice.length}</div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="text-xs uppercase text-yellow-600 mb-1">Empty regular_price</div>
                  <div className="text-2xl font-bold text-yellow-900">{withoutRegularPrice.length}</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="text-xs uppercase text-red-600 mb-1">Fetch Errors</div>
                  <div className="text-2xl font-bold text-red-900">{errorResults.length}</div>
                </div>
              </div>

              {/* Results Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        WooCommerce ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        regular_price
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        price
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        sale_price
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.map((result) => (
                      <>
                        <tr
                          key={result.productId}
                          className={`hover:bg-gray-50 cursor-pointer ${
                            result.status === 'error' ? 'bg-red-50' : ''
                          }`}
                          onClick={() =>
                            setExpandedProduct(
                              expandedProduct === result.productId ? null : result.productId
                            )
                          }
                        >
                          <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                            {result.title}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {result.wooProductId}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {result.regularPrice ? (
                              <span className="text-green-600 font-medium">{result.regularPrice}</span>
                            ) : (
                              <span className="text-yellow-600 italic">empty</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {result.price || <span className="text-gray-400 italic">empty</span>}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {result.salePrice || <span className="text-gray-400 italic">empty</span>}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {result.status === 'success' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                OK
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                {result.error}
                              </span>
                            )}
                          </td>
                        </tr>
                        {expandedProduct === result.productId && result.rawData && (
                          <tr key={`${result.productId}-expanded`}>
                            <td colSpan={6} className="px-4 py-3 bg-gray-50">
                              <div className="text-sm">
                                <strong>Raw WooCommerce Data (price fields):</strong>
                                <pre className="mt-2 bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
                                  {JSON.stringify(
                                    {
                                      id: result.rawData.id,
                                      name: result.rawData.name,
                                      type: result.rawData.type,
                                      price: result.rawData.price,
                                      regular_price: result.rawData.regular_price,
                                      sale_price: result.rawData.sale_price,
                                      price_html: result.rawData.price_html,
                                      on_sale: result.rawData.on_sale,
                                    },
                                    null,
                                    2
                                  )}
                                </pre>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
