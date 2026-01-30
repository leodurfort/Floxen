'use client';

import { useState, useCallback } from 'react';
import clsx from 'clsx';

interface CategoryField {
  attribute: string;
  requirement: string;
  status: 'pass' | 'error' | 'warning' | 'missing';
  value: any;
  message: string | null;
  description: string;
}

interface Category {
  key: string;
  label: string;
  order: number;
  score: number;
  fields: CategoryField[];
}

interface CategoryBreakdownProps {
  categories: Category[];
}

function getScoreBarColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

function getStatusIcon(status: CategoryField['status']) {
  switch (status) {
    case 'pass':
      return (
        <svg
          className="w-4 h-4 text-green-600 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M5 13l4 4L19 7"
          />
        </svg>
      );
    case 'error':
      return (
        <svg
          className="w-4 h-4 text-red-500 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      );
    case 'warning':
      return (
        <svg
          className="w-4 h-4 text-amber-500 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      );
    case 'missing':
      return (
        <div className="w-4 h-4 rounded-full bg-gray-200 flex-shrink-0" />
      );
  }
}

function getRequirementBadgeClass(requirement: string): string {
  const lower = requirement.toLowerCase();
  if (lower === 'required') return 'badge badge--required';
  if (lower === 'recommended') return 'badge badge--recommended';
  return 'badge badge--optional';
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return '--';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  const str = String(value);
  return str.length > 80 ? `${str.slice(0, 80)}...` : str;
}

export function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const sorted = [...categories].sort((a, b) => a.order - b.order);

  const toggleCategory = useCallback((key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  return (
    <div className="space-y-3">
      <h2 className="font-display text-xl font-bold text-gray-900">
        Category Breakdown
      </h2>

      <div className="space-y-2">
        {sorted.map((category) => {
          const isExpanded = expandedKeys.has(category.key);

          return (
            <div
              key={category.key}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
            >
              {/* Header */}
              <button
                type="button"
                onClick={() => toggleCategory(category.key)}
                aria-expanded={isExpanded}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-landing-primary"
              >
                <span className="flex-1 font-medium text-gray-900 text-sm">
                  {category.label}
                </span>

                {/* Mini progress bar */}
                <div className="w-20 h-1 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                  <div
                    className={clsx(
                      'h-full rounded-full transition-all',
                      getScoreBarColor(category.score)
                    )}
                    style={{ width: `${category.score}%` }}
                  />
                </div>

                {/* Score text */}
                <span
                  className={clsx(
                    'text-sm font-semibold tabular-nums w-10 text-right flex-shrink-0',
                    category.score >= 80 && 'text-green-700',
                    category.score >= 50 && category.score < 80 && 'text-amber-700',
                    category.score < 50 && 'text-red-700'
                  )}
                >
                  {category.score}%
                </span>

                {/* Chevron */}
                <svg
                  className={clsx(
                    'w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200',
                    isExpanded && 'rotate-180'
                  )}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Expanded content */}
              <div
                className="accordion-content"
                data-state={isExpanded ? 'open' : 'closed'}
              >
                <div className="px-4 pb-4">
                  <div className="border-t border-gray-100 pt-3">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-gray-500 uppercase tracking-wider">
                          <th className="text-left pb-2 font-medium">Field</th>
                          <th className="text-left pb-2 font-medium hidden sm:table-cell">
                            Requirement
                          </th>
                          <th className="text-left pb-2 font-medium">Status</th>
                          <th className="text-left pb-2 font-medium hidden md:table-cell">
                            Value
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {category.fields.map((field) => (
                          <tr key={field.attribute} className="group">
                            <td className="py-2 pr-3">
                              <div>
                                <span className="text-sm text-gray-900">
                                  {field.attribute}
                                </span>
                                <span className="sm:hidden ml-2">
                                  <span
                                    className={getRequirementBadgeClass(
                                      field.requirement
                                    )}
                                  >
                                    {field.requirement}
                                  </span>
                                </span>
                              </div>
                              {field.message && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {field.message}
                                </p>
                              )}
                              <p className="text-xs text-gray-400 mt-0.5 md:hidden">
                                {field.description}
                              </p>
                            </td>
                            <td className="py-2 pr-3 hidden sm:table-cell">
                              <span
                                className={getRequirementBadgeClass(
                                  field.requirement
                                )}
                              >
                                {field.requirement}
                              </span>
                            </td>
                            <td className="py-2 pr-3">
                              <div className="flex items-center gap-1.5">
                                {getStatusIcon(field.status)}
                                <span
                                  className={clsx(
                                    'text-xs font-medium capitalize',
                                    field.status === 'pass' && 'text-green-700',
                                    field.status === 'error' && 'text-red-700',
                                    field.status === 'warning' && 'text-amber-700',
                                    field.status === 'missing' && 'text-gray-400'
                                  )}
                                >
                                  {field.status}
                                </span>
                              </div>
                            </td>
                            <td className="py-2 hidden md:table-cell">
                              <span
                                className="text-xs text-gray-600 font-mono truncate block max-w-[200px]"
                                title={
                                  typeof field.value === 'string'
                                    ? field.value
                                    : undefined
                                }
                              >
                                {formatValue(field.value)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
