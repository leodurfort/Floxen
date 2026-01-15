'use client';

import { useEffect, useState } from 'react';
import * as api from '@/lib/api';
import type { FeedPreviewResponse } from '@/lib/api';

interface FeedPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
}

type TabId = 'products' | 'json';

export function FeedPreviewModal({ isOpen, onClose, shopId }: FeedPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<FeedPreviewResponse | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('products');

  useEffect(() => {
    if (isOpen && shopId) {
      setLoading(true);
      setError(null);
      api
        .getFeedPreview(shopId)
        .then((data) => {
          setPreview(data);
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

  const handleDownloadJson = () => {
    if (!preview) return;
    const jsonData = JSON.stringify(
      { seller: preview.seller, items: preview.items },
      null,
      2
    );
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feed-${shopId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Your Feed</h2>
            {preview && (
              <p className="text-sm text-gray-500">
                {preview.stats.included.toLocaleString()} products published
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-light"
          >
            &times;
          </button>
        </div>

        {/* Tabs */}
        {preview && (
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
              Raw JSON
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

          {preview && activeTab === 'products' && (
            <div>
              {/* Products Table - shown even when empty */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-medium text-gray-600">ID</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">Title</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.items.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-gray-500">
                          0 products published
                        </td>
                      </tr>
                    ) : (
                      preview.items.slice(0, 20).map((item, index) => (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="py-2 px-3 text-gray-600">{String(item.id || '-')}</td>
                          <td className="py-2 px-3 text-gray-900 max-w-xs truncate">
                            {String(item.title || '-')}
                          </td>
                          <td className="py-2 px-3 text-gray-600">{String(item.price || '-')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {preview.items.length > 20 && (
                <p className="mt-3 text-sm text-gray-500">
                  ...and {(preview.items.length - 20).toLocaleString()} more products
                </p>
              )}
            </div>
          )}

          {preview && activeTab === 'json' && (
            <div>
              <div className="flex justify-end mb-2">
                <button
                  onClick={handleDownloadJson}
                  className="text-sm text-[#FA7315] hover:text-[#E5650F] font-medium"
                >
                  Download JSON
                </button>
              </div>
              <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">
                {JSON.stringify(
                  { seller: preview.seller, items: preview.items.slice(0, 5) },
                  null,
                  2
                )}
                {preview.items.length > 5 && (
                  <span className="text-gray-400">
                    {'\n\n// ... and ' + (preview.items.length - 5) + ' more items'}
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
