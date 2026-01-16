'use client';

import { useEffect, useState } from 'react';
import * as api from '@/lib/api';
import { OPENAI_FEED_SPEC } from '@productsynch/shared';

interface FeedPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
}

const ITEMS_PER_PAGE = 50;

const renderCellValue = (item: Record<string, unknown>, attribute: string): string => {
  const value = item[attribute];
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
};

const getColumnWidthClass = (attribute: string): string => {
  if (attribute === 'description') return 'min-w-[300px] max-w-[400px]';
  if (['title', 'link', 'image_link', 'additional_image_link', 'video_link', 'model_3d_link', 'seller_url', 'return_policy', 'seller_privacy_policy', 'seller_tos', 'warning_url'].includes(attribute)) {
    return 'min-w-[200px] max-w-[250px]';
  }
  return 'min-w-[100px] max-w-[150px]';
};

export function FeedPreviewModal({ isOpen, onClose, shopId }: FeedPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [hasMore, setHasMore] = useState(false);

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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[80vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Your Feed</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={handleDownloadJsonl}
              disabled={downloading || items.length === 0}
              className="text-sm text-[#FA7315] hover:text-[#E5650F] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? 'Preparing...' : 'Download JSONL'}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-light"
            >
              &times;
            </button>
          </div>
        </div>

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

          {!loading && !error && (
            <div>
              {/* Feed Table */}
              <div className="overflow-x-auto">
                <table className="text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {OPENAI_FEED_SPEC.map((spec) => (
                        <th
                          key={spec.attribute}
                          className="text-left py-2 px-3 font-medium text-gray-600 whitespace-nowrap"
                        >
                          {spec.attribute}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={OPENAI_FEED_SPEC.length} className="py-8 text-center text-gray-500">
                          No items in feed
                        </td>
                      </tr>
                    ) : (
                      items.map((item, index) => (
                        <tr key={index} className="border-b border-gray-100">
                          {OPENAI_FEED_SPEC.map((spec) => (
                            <td key={spec.attribute} className="py-2 px-3 text-gray-600">
                              <div className={`truncate ${getColumnWidthClass(spec.attribute)}`}>
                                {renderCellValue(item, spec.attribute)}
                              </div>
                            </td>
                          ))}
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
