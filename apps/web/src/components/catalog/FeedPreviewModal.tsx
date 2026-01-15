'use client';

import { useEffect, useState } from 'react';
import * as api from '@/lib/api';

interface FeedPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
}

type TabId = 'products' | 'json';

const ITEMS_PER_PAGE = 20;

export function FeedPreviewModal({ isOpen, onClose, shopId }: FeedPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('products');

  // Initial load when modal opens
  useEffect(() => {
    if (isOpen && shopId) {
      setLoading(true);
      setError(null);
      setItems([]);
      setHasMore(false);

      api
        .getFeedPreview(shopId, { limit: ITEMS_PER_PAGE, offset: 0 })
        .then((data) => {
          setItems(data.items);
          setHasMore(data.hasMore);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [isOpen, shopId]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('products');
    }
  }, [isOpen]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const data = await api.getFeedPreview(shopId, {
        limit: ITEMS_PER_PAGE,
        offset: items.length,
      });
      setItems((prev) => [...prev, ...data.items]);
      setHasMore(data.hasMore);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleDownloadJsonl = async () => {
    setDownloading(true);
    try {
      // Fetch all items for download
      const data = await api.getFeedPreview(shopId, { download: true });
      const jsonlData = data.items.map((item) => JSON.stringify(item)).join('\n');
      const blob = new Blob([jsonlData], { type: 'application/jsonl' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `feed-${shopId}.jsonl`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Your Feed</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-light"
          >
            &times;
          </button>
        </div>

        {/* Tabs */}
        {items.length > 0 && (
          <div className="flex border-b border-gray-200 px-4">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'products'
                  ? 'border-[#FA7315] text-[#FA7315]'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Products
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'json'
                  ? 'border-[#FA7315] text-[#FA7315]'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Raw JSONL
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading && (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-500">Loading feed...</div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && activeTab === 'products' && (
            <div>
              {/* Products Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-medium text-gray-600">ID</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">Title</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-600">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-gray-500">
                          No products in feed
                        </td>
                      </tr>
                    ) : (
                      items.map((item, index) => (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="py-2 px-3 text-gray-600">{String(item.id || '-')}</td>
                          <td className="py-2 px-3 text-gray-900 max-w-xs truncate">
                            {String(item.title || '-')}
                          </td>
                          <td className="py-2 px-3 text-gray-600 text-right">
                            {String(item.price || '-')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="mt-4 text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-6 py-2 text-sm font-medium text-[#FA7315] hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingMore ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </div>
          )}

          {!loading && !error && activeTab === 'json' && (
            <div>
              <div className="flex justify-end mb-2">
                <button
                  onClick={handleDownloadJsonl}
                  disabled={downloading}
                  className="text-sm text-[#FA7315] hover:text-[#E5650F] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {downloading ? 'Preparing download...' : 'Download JSONL'}
                </button>
              </div>
              <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">
                {items.slice(0, 5).map((item) => JSON.stringify(item)).join('\n')}
                {items.length > 5 && (
                  <span className="text-gray-400">
                    {'\n\n// ... and ' + (items.length - 5) + ' more lines'}
                  </span>
                )}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
