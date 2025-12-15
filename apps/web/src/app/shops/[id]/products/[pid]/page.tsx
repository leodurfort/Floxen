'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getProductEnrichmentData,
  triggerProductEnrich,
  updateProductManualField,
  updateOpenAIField,
  updateProductSelectedSource,
} from '@/lib/api';
import { useAuth } from '@/store/auth';
import { OPENAI_FEED_SPEC } from '@productsynch/shared';

// The 4 AI-enrichable fields (only these can toggle between AI and WooCommerce sources)
type EnrichableField = 'title' | 'description' | 'product_category' | 'q_and_a';

interface EnrichmentData {
  product: {
    id: string;
    wooProductId: number;
    status: string;
    isValid: boolean;
    feedEnableSearch: boolean;
    feedEnableCheckout: boolean;
  };
  autoFilled: Record<string, any>;
  edited: Record<string, any>;
  aiData: {
    title?: string;
    description?: string;
    category?: string;
    keywords?: string[];
    q_and_a?: Array<{ q: string; a: string }>;
  };
  selectedSources: Record<string, 'manual' | 'ai'>;
  resolved: any;
  validationErrors: Record<string, string[]>;
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string; pid: string }>();
  const router = useRouter();
  const { accessToken, hydrate, hydrated } = useAuth();

  const [data, setData] = useState<EnrichmentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['basic_product_data', 'pricing', 'images'])
  );

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && !accessToken) router.push('/login');
  }, [hydrated, accessToken, router]);

  useEffect(() => {
    if (!accessToken || !params?.id || !params?.pid) return;
    loadProduct();
  }, [accessToken, params?.id, params?.pid]);

  async function loadProduct() {
    if (!accessToken || !params?.id || !params?.pid) return;
    setLoading(true);
    setError(null);
    try {
      const enrichmentData = await getProductEnrichmentData(params.id, params.pid, accessToken);
      setData(enrichmentData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleEnrich() {
    if (!accessToken || !params?.id || !params?.pid) return;
    setEnriching(true);
    setError(null);
    try {
      await triggerProductEnrich(params.id, params.pid, accessToken);
      // Reload after a delay to get enrichment results
      setTimeout(() => loadProduct(), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setEnriching(false);
    }
  }

  async function handleEditField(fieldName: string, isEnrichable: boolean) {
    if (!accessToken || !params?.id || !params?.pid || !data) return;

    try {
      // Parse value based on field type
      let value: any = editValue;

      // Simple validation
      const spec = OPENAI_FEED_SPEC.find(s => s.attribute === fieldName);
      if (spec) {
        // Check character limits
        const maxCharRule = spec.validationRules.find(r => r.includes('Max') && r.includes('characters'));
        if (maxCharRule && typeof value === 'string') {
          const match = maxCharRule.match(/Max (\d+) characters/);
          if (match) {
            const max = parseInt(match[1]);
            if (value.length > max) {
              setError(`${fieldName}: max ${max} characters`);
              return;
            }
          }
        }
      }

      // Special handling for arrays
      if (fieldName === 'ai_keywords' || fieldName === 'additional_image_links') {
        value = editValue.split('\n').map(s => s.trim()).filter(Boolean);
      }

      // Special handling for Q&A
      if (fieldName === 'q_and_a') {
        try {
          value = JSON.parse(editValue);
          if (!Array.isArray(value) || value.length < 3 || value.length > 5) {
            setError('Q&A: must have 3-5 pairs');
            return;
          }
        } catch {
          setError('Q&A: invalid JSON format');
          return;
        }
      }

      // Update based on field type
      if (isEnrichable) {
        // Use the manual field update endpoint for enrichable fields
        await updateProductManualField(params.id, params.pid, fieldName, value, accessToken);
      } else {
        // Use the openai field update endpoint for non-enrichable fields
        await updateOpenAIField(params.id, params.pid, fieldName, value, accessToken);
      }

      await loadProduct();
      setEditingField(null);
      setEditValue('');
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleSourceChange(field: string, source: 'manual' | 'ai') {
    if (!accessToken || !params?.id || !params?.pid) return;
    setError(null);
    try {
      await updateProductSelectedSource(params.id, params.pid, field, source, accessToken);
      await loadProduct();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function startEdit(fieldName: string) {
    if (!data) return;

    const effectiveValue = getEffectiveValue(fieldName);
    setEditingField(fieldName);

    if (Array.isArray(effectiveValue)) {
      setEditValue(effectiveValue.join('\n'));
    } else if (typeof effectiveValue === 'object' && effectiveValue !== null) {
      setEditValue(JSON.stringify(effectiveValue, null, 2));
    } else {
      setEditValue(effectiveValue || '');
    }
  }

  function getEffectiveValue(fieldName: string): any {
    if (!data) return null;

    // For enrichable fields, check selectedSources
    const spec = OPENAI_FEED_SPEC.find(s => s.attribute === fieldName);
    if (spec?.isAiEnrichable) {
      const source = data.selectedSources[fieldName] || 'manual';
      if (source === 'ai') {
        // Map to aiData fields
        if (fieldName === 'title') return data.aiData.title;
        if (fieldName === 'description') return data.aiData.description;
        if (fieldName === 'product_category') return data.aiData.category;
        if (fieldName === 'q_and_a') return data.aiData.q_and_a;
      }
    }

    // For non-enrichable fields or manual source: edited > autoFilled
    return data.edited[fieldName] ?? data.autoFilled[fieldName] ?? null;
  }

  function formatValueForDisplay(value: any): string {
    if (value === null || value === undefined) return '—';
    if (Array.isArray(value)) {
      if (value.length === 0) return '—';
      if (typeof value[0] === 'object') {
        return JSON.stringify(value, null, 2);
      }
      return value.join(', ');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return String(value);
  }

  function toggleCategory(category: string) {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  if (!hydrated) return <main className="shell"><div className="subtle">Loading...</div></main>;
  if (!accessToken || !data) return null;

  // Group fields by category
  const categories = [...new Set(OPENAI_FEED_SPEC.map(f => f.category))];
  const fieldsByCategory = categories.map(cat => ({
    category: cat,
    fields: OPENAI_FEED_SPEC.filter(f => f.category === cat),
  }));

  return (
    <main className="shell space-y-6">
      {/* Header */}
      <div className="panel space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="uppercase tracking-[0.18em] text-xs text-white/60">Product Enrichment</p>
            <h1 className="section-title mt-1">{data.autoFilled.title || 'Untitled Product'}</h1>
          </div>
          <button
            className="btn btn--primary"
            onClick={handleEnrich}
            disabled={enriching || loading}
          >
            {enriching ? 'Generating...' : 'Generate AI Suggestions'}
          </button>
        </div>

        {error && <div className="text-sm text-red-300">{error}</div>}

        <div className="flex gap-4 text-sm text-white/60">
          <span>WooCommerce ID: {data.product.wooProductId}</span>
          <span>Status: {data.product.status}</span>
          <span>Valid: {data.product.isValid ? 'Yes' : 'No'}</span>
          <span>Errors: {Object.keys(data.validationErrors).length}</span>
        </div>

        <div className="text-xs text-white/40">
          All 63 OpenAI feed attributes are listed below, organized by category. Edit WooCommerce-mapped values, generate AI suggestions for enrichable fields, and select which source to use.
        </div>
      </div>

      {/* Field Categories */}
      {fieldsByCategory.map(({ category, fields }) => (
        <div key={category} className="panel space-y-4">
          {/* Category Header */}
          <button
            className="w-full flex items-center justify-between text-left"
            onClick={() => toggleCategory(category)}
          >
            <h2 className="text-xl font-semibold capitalize">{category.replace(/_/g, ' ')}</h2>
            <span className="text-white/40">
              {expandedCategories.has(category) ? '▼' : '▶'} {fields.length} fields
            </span>
          </button>

          {/* Fields in Category */}
          {expandedCategories.has(category) && (
            <div className="space-y-4">
              {fields.map((spec) => {
                const fieldName = spec.attribute;
                const isEnrichable = spec.isAiEnrichable;
                const selectedSource = data.selectedSources[fieldName] || 'manual';
                const effectiveValue = getEffectiveValue(fieldName);
                const hasEdit = data.edited[fieldName] !== undefined && data.edited[fieldName] !== null;
                const validationError = data.validationErrors[fieldName];
                const aiValue = isEnrichable ? (
                  fieldName === 'title' ? data.aiData.title :
                  fieldName === 'description' ? data.aiData.description :
                  fieldName === 'product_category' ? data.aiData.category :
                  fieldName === 'q_and_a' ? data.aiData.q_and_a :
                  null
                ) : null;

                return (
                  <div key={fieldName} className="border border-white/10 rounded-lg p-4 space-y-3">
                    {/* Field Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-semibold">
                          {spec.attribute}
                          {spec.requirement === 'Required' && <span className="text-red-400 ml-1">*</span>}
                          {spec.requirement === 'Conditional' && <span className="text-yellow-400 ml-1">†</span>}
                          {isEnrichable && <span className="text-blue-400 ml-2 text-xs">AI Enrichable</span>}
                        </h3>
                        <p className="text-xs text-white/40 mt-1">{spec.description}</p>
                        {spec.validationRules.length > 0 && (
                          <p className="text-xs text-white/30 mt-1">Rules: {spec.validationRules.join(', ')}</p>
                        )}
                      </div>
                      {validationError && (
                        <div className="text-xs text-red-400">
                          {validationError.map((err, i) => <div key={i}>{err}</div>)}
                        </div>
                      )}
                    </div>

                    {/* 3 Columns */}
                    <div className="grid md:grid-cols-3 gap-4">
                      {/* Column 1: WooCommerce / Manual Edit */}
                      <div className="border border-emerald-500/30 rounded p-3 space-y-2 bg-emerald-500/5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-emerald-300">
                            WooCommerce {hasEdit && '(Edited)'}
                          </span>
                          {editingField !== fieldName && (
                            <button
                              className="text-xs text-white/60 hover:text-white"
                              onClick={() => startEdit(fieldName)}
                            >
                              {hasEdit ? 'Edit' : '+ Edit'}
                            </button>
                          )}
                        </div>

                        {editingField === fieldName ? (
                          <div className="space-y-2">
                            <textarea
                              className="w-full p-2 bg-black/50 border border-white/20 rounded text-xs font-mono"
                              rows={6}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              placeholder={`Edit ${fieldName}...`}
                            />
                            <div className="flex gap-2">
                              <button
                                className="text-xs btn btn--primary btn--sm"
                                onClick={() => handleEditField(fieldName, isEnrichable)}
                              >
                                Save
                              </button>
                              <button
                                className="text-xs btn btn--sm"
                                onClick={() => {
                                  setEditingField(null);
                                  setEditValue('');
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="text-xs text-white/80 whitespace-pre-wrap max-h-24 overflow-y-auto font-mono">
                              {formatValueForDisplay(effectiveValue)}
                            </div>
                            {isEnrichable && (
                              <button
                                className={`text-xs btn btn--sm w-full ${selectedSource === 'manual' ? 'btn--primary' : ''}`}
                                onClick={() => handleSourceChange(fieldName, 'manual')}
                                disabled={selectedSource === 'manual'}
                              >
                                {selectedSource === 'manual' ? '✓ Selected' : 'Use This'}
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      {/* Column 2: AI Suggestion (only for enrichable fields) */}
                      {isEnrichable ? (
                        <div className="border border-blue-500/30 rounded p-3 space-y-2 bg-blue-500/5">
                          <span className="text-xs font-medium text-blue-300">AI Suggestion</span>
                          {aiValue ? (
                            <>
                              <div className="text-xs text-white/80 whitespace-pre-wrap max-h-24 overflow-y-auto font-mono">
                                {formatValueForDisplay(aiValue)}
                              </div>
                              <button
                                className={`text-xs btn btn--sm w-full ${selectedSource === 'ai' ? 'btn--primary' : ''}`}
                                onClick={() => handleSourceChange(fieldName, 'ai')}
                                disabled={selectedSource === 'ai'}
                              >
                                {selectedSource === 'ai' ? '✓ Selected' : 'Use This'}
                              </button>
                            </>
                          ) : (
                            <div className="text-xs text-white/40 italic">
                              Generate AI suggestions to see enhanced content
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="border border-white/10 rounded p-3 bg-white/5">
                          <div className="text-xs text-white/40 italic">
                            AI enrichment not available for this field
                          </div>
                        </div>
                      )}

                      {/* Column 3: Resolved Value (what will be in feed) */}
                      <div className="border border-purple-500/30 rounded p-3 space-y-2 bg-purple-500/5">
                        <span className="text-xs font-medium text-purple-300">Final Value (in feed)</span>
                        <div className="text-xs text-white/80 whitespace-pre-wrap max-h-24 overflow-y-auto font-mono">
                          {formatValueForDisplay(data.resolved[fieldName] || effectiveValue)}
                        </div>
                      </div>
                    </div>

                    {/* Example Value */}
                    {spec.example && (
                      <div className="text-xs text-white/30 border-t border-white/5 pt-2">
                        Example: <code className="text-white/40">{spec.example}</code>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </main>
  );
}
