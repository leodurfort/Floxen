'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  OPENAI_FEED_SPEC,
  CATEGORY_CONFIG,
  LOCKED_FIELD_SET,
  STATIC_OVERRIDE_ALLOWED_LOCKED_FIELDS,
  validateStaticValue,
  OpenAIFieldCategory,
  OpenAIFieldSpec,
} from '@productsynch/shared';
import { BulkUpdateOperation } from '@/lib/api';

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (update: BulkUpdateOperation) => Promise<void>;
  selectedCount: number;
  isProcessing: boolean;
}

export function BulkEditModal({
  isOpen,
  onClose,
  onSubmit,
  selectedCount,
  isProcessing,
}: BulkEditModalProps) {
  const [selectedAttribute, setSelectedAttribute] = useState<string | null>(null);
  const [overrideType, setOverrideType] = useState<'mapping' | 'static' | 'remove'>('static');
  const [staticValue, setStaticValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedAttribute(null);
      setOverrideType('static');
      setStaticValue('');
      setValidationError(null);
    }
  }, [isOpen]);

  // Get available fields (exclude fully locked fields and flags)
  const availableFields = useMemo(() => {
    return OPENAI_FEED_SPEC.filter(spec => {
      // Skip enable_search and enable_checkout (handled by toolbar buttons)
      if (spec.attribute === 'enable_search' || spec.attribute === 'enable_checkout') {
        return false;
      }
      // Allow fields that are not locked, or are locked but allow static overrides
      const isFullyLocked = LOCKED_FIELD_SET.has(spec.attribute) &&
                           !STATIC_OVERRIDE_ALLOWED_LOCKED_FIELDS.has(spec.attribute);
      return !isFullyLocked;
    });
  }, []);

  // Group by category
  const categories = useMemo(() => {
    const groups: { id: OpenAIFieldCategory; label: string; order: number; fields: OpenAIFieldSpec[] }[] = [];

    Object.entries(CATEGORY_CONFIG).forEach(([id, config]) => {
      const fields = availableFields.filter(spec => spec.category === id);
      if (fields.length > 0) {
        groups.push({
          id: id as OpenAIFieldCategory,
          label: config.label,
          order: config.order,
          fields,
        });
      }
    });

    return groups.sort((a, b) => a.order - b.order);
  }, [availableFields]);

  const selectedSpec = useMemo(() => {
    return availableFields.find(f => f.attribute === selectedAttribute);
  }, [selectedAttribute, availableFields]);

  const isLockedField = selectedAttribute ? LOCKED_FIELD_SET.has(selectedAttribute) : false;

  // Validate static value on change
  useEffect(() => {
    if (overrideType === 'static' && selectedAttribute && staticValue) {
      const validation = validateStaticValue(selectedAttribute, staticValue);
      setValidationError(validation.isValid ? null : validation.error || 'Invalid value');
    } else {
      setValidationError(null);
    }
  }, [overrideType, selectedAttribute, staticValue]);

  const handleSubmit = async () => {
    if (!selectedAttribute) return;

    let update: BulkUpdateOperation;

    if (overrideType === 'remove') {
      update = { type: 'remove_override', attribute: selectedAttribute };
    } else if (overrideType === 'static') {
      if (!staticValue.trim()) {
        setValidationError('Value is required');
        return;
      }
      const validation = validateStaticValue(selectedAttribute, staticValue);
      if (!validation.isValid) {
        setValidationError(validation.error || 'Invalid value');
        return;
      }
      update = { type: 'static_override', attribute: selectedAttribute, value: staticValue };
    } else {
      // mapping type - for now just set to null (no mapping)
      update = { type: 'field_mapping', attribute: selectedAttribute, wooField: null };
    }

    await onSubmit(update);
  };

  const canSubmit = selectedAttribute && !validationError && !isProcessing &&
    (overrideType !== 'static' || staticValue.trim());

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#1a1d29] rounded-2xl border border-white/10 w-[600px] max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Bulk Edit Fields</h2>
            <p className="text-sm text-white/60 mt-1">
              Apply changes to {selectedCount.toLocaleString()} selected product{selectedCount !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-white/40 hover:text-white transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            {/* Field Selection */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Select Field to Update
              </label>
              <select
                value={selectedAttribute || ''}
                onChange={(e) => {
                  setSelectedAttribute(e.target.value || null);
                  setStaticValue('');
                  setValidationError(null);
                  // Default to static for locked fields
                  if (e.target.value && LOCKED_FIELD_SET.has(e.target.value)) {
                    setOverrideType('static');
                  }
                }}
                className="w-full px-4 py-3 bg-[#252936] text-white rounded-lg border border-white/10 focus:outline-none focus:border-[#5df0c0]/50"
              >
                <option value="">Choose a field...</option>
                {categories.map(cat => (
                  <optgroup key={cat.id} label={cat.label}>
                    {cat.fields.map(field => (
                      <option key={field.attribute} value={field.attribute}>
                        {field.attribute}
                        {LOCKED_FIELD_SET.has(field.attribute) ? ' (static only)' : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Field Info */}
            {selectedSpec && (
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <p className="text-sm text-white/80">{selectedSpec.description}</p>
                <p className="text-xs text-white/40 mt-2">
                  Type: {selectedSpec.dataType}
                  {selectedSpec.supportedValues && ` | Values: ${selectedSpec.supportedValues}`}
                </p>
                {selectedSpec.example && (
                  <p className="text-xs text-white/40 mt-1">Example: {selectedSpec.example}</p>
                )}
              </div>
            )}

            {/* Override Type */}
            {selectedAttribute && (
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Update Type
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOverrideType('static')}
                    className={`
                      px-4 py-2 rounded-lg border text-sm font-medium transition-colors
                      ${overrideType === 'static'
                        ? 'bg-[#5df0c0]/20 border-[#5df0c0]/50 text-[#5df0c0]'
                        : 'bg-[#252936] border-white/10 text-white/60 hover:text-white'}
                    `}
                  >
                    Set Static Value
                  </button>
                  {!isLockedField && (
                    <button
                      onClick={() => setOverrideType('mapping')}
                      className={`
                        px-4 py-2 rounded-lg border text-sm font-medium transition-colors
                        ${overrideType === 'mapping'
                          ? 'bg-[#5df0c0]/20 border-[#5df0c0]/50 text-[#5df0c0]'
                          : 'bg-[#252936] border-white/10 text-white/60 hover:text-white'}
                      `}
                    >
                      Clear Mapping
                    </button>
                  )}
                  <button
                    onClick={() => setOverrideType('remove')}
                    className={`
                      px-4 py-2 rounded-lg border text-sm font-medium transition-colors
                      ${overrideType === 'remove'
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                        : 'bg-[#252936] border-white/10 text-white/60 hover:text-white'}
                    `}
                  >
                    Remove Override
                  </button>
                </div>
              </div>
            )}

            {/* Static Value Input */}
            {selectedAttribute && overrideType === 'static' && (
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Static Value
                </label>
                <input
                  type="text"
                  value={staticValue}
                  onChange={(e) => setStaticValue(e.target.value)}
                  placeholder={selectedSpec?.example || 'Enter value...'}
                  className={`
                    w-full px-4 py-3 bg-[#252936] text-white rounded-lg border
                    focus:outline-none transition-colors
                    ${validationError
                      ? 'border-red-500/50 focus:border-red-500'
                      : 'border-white/10 focus:border-[#5df0c0]/50'}
                  `}
                />
                {validationError && (
                  <p className="mt-2 text-sm text-red-400">{validationError}</p>
                )}
              </div>
            )}

            {/* Remove Override Warning */}
            {selectedAttribute && overrideType === 'remove' && (
              <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                <p className="text-sm text-amber-400">
                  This will remove any existing override for "{selectedAttribute}" and revert to shop-level defaults.
                </p>
              </div>
            )}

            {/* Clear Mapping Info */}
            {selectedAttribute && overrideType === 'mapping' && (
              <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                <p className="text-sm text-blue-400">
                  This will set the mapping to "No mapping" for "{selectedAttribute}", excluding this field from the feed.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-white/60 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-6 py-2 bg-[#5df0c0] text-black font-medium rounded-lg hover:bg-[#5df0c0]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </>
            ) : (
              `Apply to ${selectedCount.toLocaleString()} Products`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
