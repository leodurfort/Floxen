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
  const [editValidationError, setEditValidationError] = useState<string | null>(null);
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

  function validateField(fieldName: string, value: any, spec: any): string | null {
    if (!spec) return null;

    // Empty value validation
    if (spec.requirement === 'Required' && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return `${fieldName} is required`;
    }

    // Skip validation for empty optional fields
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return null;
    }

    // Validate each rule
    for (const rule of spec.validationRules) {
      // Character length validation
      if (rule.includes('Max') && rule.includes('characters') && typeof value === 'string') {
        const match = rule.match(/Max (\d+) characters/);
        if (match) {
          const max = parseInt(match[1]);
          if (value.length > max) {
            return `Must be ${max} characters or less (currently ${value.length})`;
          }
        }
      }

      if (rule.includes('Min') && rule.includes('characters') && typeof value === 'string') {
        const match = rule.match(/Min (\d+) characters/);
        if (match) {
          const min = parseInt(match[1]);
          if (value.length < min) {
            return `Must be at least ${min} characters (currently ${value.length})`;
          }
        }
      }

      // Array length validation
      if (rule.includes('Max') && rule.includes('items') && Array.isArray(value)) {
        const match = rule.match(/Max (\d+) items/);
        if (match) {
          const max = parseInt(match[1]);
          if (value.length > max) {
            return `Must have ${max} items or less (currently ${value.length})`;
          }
        }
      }

      if (rule.includes('Min') && rule.includes('items') && Array.isArray(value)) {
        const match = rule.match(/Min (\d+) items/);
        if (match) {
          const min = parseInt(match[1]);
          if (value.length < min) {
            return `Must have at least ${min} items (currently ${value.length})`;
          }
        }
      }

      // URL validation
      if (rule.includes('Valid URL') && typeof value === 'string') {
        try {
          new URL(value);
        } catch {
          return 'Must be a valid URL';
        }
      }

      // Numeric validation
      if (rule.includes('Positive number') && typeof value === 'number') {
        if (value < 0) {
          return 'Must be a positive number';
        }
      }

      // Date format validation (ISO 8601)
      if (rule.includes('ISO 8601') && typeof value === 'string') {
        const iso8601Regex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;
        if (!iso8601Regex.test(value)) {
          return 'Must be in ISO 8601 format (e.g., 2024-01-15 or 2024-01-15T10:30:00Z)';
        }
      }
    }

    // Enum validation
    if (spec.supportedValues && typeof value === 'string') {
      const allowedValues = spec.supportedValues.split(',').map((v: string) => v.trim());
      if (!allowedValues.includes(value)) {
        return `Must be one of: ${allowedValues.join(', ')}`;
      }
    }

    return null;
  }

  async function handleEditField(fieldName: string, isEnrichable: boolean) {
    if (!accessToken || !params?.id || !params?.pid || !data) return;

    try {
      // Parse value based on field type
      let value: any = editValue.trim();

      const spec = OPENAI_FEED_SPEC.find(s => s.attribute === fieldName);
      if (!spec) {
        setError('Field specification not found');
        return;
      }

      // Type conversion based on dataType
      if (spec.dataType === 'number' || spec.dataType === 'integer' || spec.dataType === 'decimal') {
        const parsed = parseFloat(value);
        if (value !== '' && isNaN(parsed)) {
          setError('Must be a valid number');
          return;
        }
        value = parsed;
      } else if (spec.dataType === 'boolean') {
        value = value.toLowerCase() === 'true' || value === '1';
      } else if (spec.dataType === 'array') {
        // Handle arrays (split by newline or comma)
        if (fieldName === 'q_and_a') {
          try {
            value = JSON.parse(editValue);
            if (!Array.isArray(value)) {
              setError('Q&A must be a JSON array');
              return;
            }
          } catch {
            setError('Q&A: invalid JSON format');
            return;
          }
        } else {
          value = editValue.split('\n').map((s: string) => s.trim()).filter(Boolean);
        }
      }

      // Validate the field
      const validationError = validateField(fieldName, value, spec);
      if (validationError) {
        setError(validationError);
        return;
      }

      // Update based on field type
      if (isEnrichable) {
        await updateProductManualField(params.id, params.pid, fieldName, value, accessToken);
      } else {
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
    setEditValidationError(null);

    if (Array.isArray(effectiveValue)) {
      setEditValue(effectiveValue.join('\n'));
    } else if (typeof effectiveValue === 'object' && effectiveValue !== null) {
      setEditValue(JSON.stringify(effectiveValue, null, 2));
    } else {
      setEditValue(effectiveValue || '');
    }
  }

  function handleEditValueChange(newValue: string, fieldName: string) {
    setEditValue(newValue);

    // Real-time validation
    const spec = OPENAI_FEED_SPEC.find(s => s.attribute === fieldName);
    if (!spec) return;

    // Convert value for validation
    let valueToValidate: any = newValue.trim();

    if (spec.dataType === 'number' || spec.dataType === 'integer' || spec.dataType === 'decimal') {
      const parsed = parseFloat(valueToValidate);
      if (valueToValidate !== '' && !isNaN(parsed)) {
        valueToValidate = parsed;
      }
    } else if (spec.dataType === 'array' && fieldName !== 'q_and_a') {
      valueToValidate = newValue.split('\n').map(s => s.trim()).filter(Boolean);
    }

    const error = validateField(fieldName, valueToValidate, spec);
    setEditValidationError(error);
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
    const value = data.edited[fieldName] ?? data.autoFilled[fieldName] ?? null;

    // Special case: mpn is mutually exclusive with gtin
    // If gtin has a value, mpn should be null in the feed
    if (fieldName === 'mpn') {
      const gtinValue = data.edited['gtin'] ?? data.autoFilled['gtin'];
      if (gtinValue) return null;
    }

    return value;
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
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold">
                            {spec.attribute}
                            {spec.requirement === 'Required' && <span className="text-red-400 ml-1">*</span>}
                          </h3>

                          {/* Requirement Label */}
                          {spec.requirement === 'Optional' && (
                            <span className="text-xs text-white/40 px-2 py-0.5 bg-white/5 rounded">Optional</span>
                          )}
                          {spec.requirement === 'Recommended' && (
                            <span className="text-xs text-blue-300/60 px-2 py-0.5 bg-blue-500/10 rounded">Recommended</span>
                          )}

                          {/* Conditional Info Icon with Tooltip */}
                          {spec.requirement === 'Conditional' && (
                            <div className="relative group">
                              <span className="text-yellow-400 cursor-help text-sm">ℹ️</span>
                              <div className="absolute left-0 top-6 hidden group-hover:block z-10 w-64 p-3 bg-gray-900 border border-yellow-400/30 rounded-lg shadow-lg text-xs text-white/80">
                                <div className="font-semibold text-yellow-300 mb-1">Conditional Field</div>
                                {spec.dependencies ? (
                                  <>
                                    <div className="mb-1">Required when:</div>
                                    <div className="text-white/60">{spec.dependencies}</div>
                                  </>
                                ) : (
                                  <div>Required under certain conditions</div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* AI Enrichable Badge */}
                          {isEnrichable && <span className="text-blue-400 text-xs">AI Enrichable</span>}
                        </div>
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
                            {spec.dataType === 'Enum' && spec.supportedValues ? (
                              // Render dropdown for enum fields
                              <select
                                className={`w-full p-2 bg-black/50 border rounded text-xs font-mono ${
                                  editValidationError ? 'border-red-500' : 'border-white/20'
                                }`}
                                value={editValue}
                                onChange={(e) => handleEditValueChange(e.target.value, fieldName)}
                              >
                                <option value="">-- Select or leave empty --</option>
                                {spec.supportedValues.split(',').map((option: string) => (
                                  <option key={option.trim()} value={option.trim()}>
                                    {option.trim()}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              // Render textarea for other fields
                              <textarea
                                className={`w-full p-2 bg-black/50 border rounded text-xs font-mono ${
                                  editValidationError ? 'border-red-500' : 'border-white/20'
                                }`}
                                rows={6}
                                value={editValue}
                                onChange={(e) => handleEditValueChange(e.target.value, fieldName)}
                                placeholder={`Edit ${fieldName}...`}
                              />
                            )}
                            {editValidationError && (
                              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded p-2">
                                ⚠️ {editValidationError}
                              </div>
                            )}
                            <div className="flex gap-2">
                              <button
                                className="text-xs btn btn--primary btn--sm"
                                onClick={() => handleEditField(fieldName, isEnrichable)}
                                disabled={!!editValidationError}
                                title={editValidationError || undefined}
                              >
                                Save
                              </button>
                              <button
                                className="text-xs btn btn--sm"
                                onClick={() => {
                                  setEditingField(null);
                                  setEditValue('');
                                  setEditValidationError(null);
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
