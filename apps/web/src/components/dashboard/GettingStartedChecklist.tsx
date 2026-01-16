'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ChecklistStep {
  id: string;
  title: string;
  isComplete: boolean;
  isOptional?: boolean;
  content: React.ReactNode;
}

interface GettingStartedChecklistProps {
  shopId: string;
  steps: {
    connectStore: boolean;
    fieldMappings: boolean;
    reviewCatalog: boolean;
    activateFeed: boolean;
    unlockMoreItems: boolean;
  };
  stepDetails: {
    storeUrl: string;
    totalItems: number;
    requiredFieldsMapped: number;
    totalRequiredFields: number;
    needsAttention: number;
    inFeed: number;
    subscriptionTier: string;
  };
}

const STORAGE_KEY_PREFIX = 'productsynch:gettingStarted:collapsed:';

export function GettingStartedChecklist({
  shopId,
  steps,
  stepDetails,
}: GettingStartedChecklistProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  // Load collapsed state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${shopId}`);
    if (stored === 'true') {
      setIsCollapsed(true);
    }
  }, [shopId]);

  // Save collapsed state to localStorage
  const handleToggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${shopId}`, String(newState));
  };

  const handleToggleStep = (stepId: string) => {
    setExpandedStep(expandedStep === stepId ? null : stepId);
  };

  // Build the checklist steps
  const checklistSteps: ChecklistStep[] = [
    {
      id: 'connectStore',
      title: 'Connect your WooCommerce store',
      isComplete: steps.connectStore,
      content: steps.connectStore ? (
        <div className="text-sm text-gray-600">
          {stepDetails.storeUrl} &bull; {stepDetails.totalItems.toLocaleString()} items imported
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-sm text-gray-600">Connect your store to get started</div>
          <Link
            href="/shops"
            className="inline-block text-sm font-medium text-[#FA7315] hover:text-[#E5650F]"
          >
            Connect Store &rarr;
          </Link>
        </div>
      ),
    },
    {
      id: 'fieldMappings',
      title: 'Configure field mappings',
      isComplete: steps.fieldMappings,
      content: steps.fieldMappings ? (
        <div className="text-sm text-gray-600">
          {stepDetails.totalRequiredFields}/{stepDetails.totalRequiredFields} required fields mapped
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-sm text-gray-600">
            {stepDetails.requiredFieldsMapped}/{stepDetails.totalRequiredFields} required fields
            mapped
          </div>
          <Link
            href={`/shops/${shopId}/setup`}
            className="inline-block text-sm font-medium text-[#FA7315] hover:text-[#E5650F]"
          >
            Complete Setup &rarr;
          </Link>
        </div>
      ),
    },
    {
      id: 'reviewCatalog',
      title: 'Review your catalog',
      isComplete: steps.reviewCatalog,
      isOptional: true,
      content: (
        <div className="space-y-2">
          <div className="text-sm text-gray-600">
            {steps.reviewCatalog
              ? 'All items validated'
              : `${stepDetails.needsAttention.toLocaleString()} items need attention`}
          </div>
          <Link
            href={`/shops/${shopId}/products`}
            className="inline-block text-sm font-medium text-[#FA7315] hover:text-[#E5650F]"
          >
            View Catalog &rarr;
          </Link>
        </div>
      ),
    },
    {
      id: 'activateFeed',
      title: 'Activate your feed',
      isComplete: steps.activateFeed,
      content: steps.activateFeed ? (
        <div className="text-sm text-gray-600">
          {stepDetails.inFeed.toLocaleString()} items published on ChatGPT
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-sm text-gray-600">
            {stepDetails.inFeed.toLocaleString()} items ready for ChatGPT
          </div>
          <Link
            href={`/shops/${shopId}/products`}
            className="inline-block text-sm font-medium text-[#FA7315] hover:text-[#E5650F]"
          >
            Go to Catalog &rarr;
          </Link>
        </div>
      ),
    },
    {
      id: 'unlockMoreItems',
      title: 'Unlock more items',
      isComplete: steps.unlockMoreItems,
      content: steps.unlockMoreItems ? (
        <div className="text-sm text-gray-600">Unlimited items unlocked</div>
      ) : (
        <div className="space-y-2">
          <div className="text-sm text-gray-600">
            Free plan: 500 items max &bull; You have {stepDetails.totalItems.toLocaleString()} items
          </div>
          <Link
            href="/settings/billing"
            className="inline-block text-sm font-medium text-[#FA7315] hover:text-[#E5650F]"
          >
            View Plans &rarr;
          </Link>
        </div>
      ),
    },
  ];

  const completedCount = checklistSteps.filter((s) => s.isComplete).length;
  const totalCount = checklistSteps.length;
  const progressPercent = (completedCount / totalCount) * 100;

  // If all steps are complete, don't render the checklist
  if (completedCount === totalCount) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
        onClick={handleToggleCollapse}
      >
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">Getting Started</h3>
          <span className="text-sm text-gray-500">
            {completedCount}/{totalCount} completed
          </span>
        </div>
        <button className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          {isCollapsed ? 'Expand' : 'Collapse'}
          <svg
            className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-full bg-[#FA7315] transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Steps - only show when not collapsed */}
      {!isCollapsed && (
        <div className="divide-y divide-gray-100">
          {checklistSteps.map((step) => (
            <div key={step.id} className="p-4">
              {/* Step header */}
              <div
                className="flex items-start gap-3 cursor-pointer"
                onClick={() => handleToggleStep(step.id)}
              >
                {/* Checkbox icon */}
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    step.isComplete
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {step.isComplete ? (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                  )}
                </div>

                {/* Title */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-medium ${
                        step.isComplete ? 'text-gray-500' : 'text-gray-900'
                      }`}
                    >
                      {step.title}
                    </span>
                    {step.isOptional && (
                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                        Optional
                      </span>
                    )}
                  </div>
                </div>

                {/* Expand indicator */}
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    expandedStep === step.id ? 'rotate-180' : ''
                  }`}
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
              </div>

              {/* Step content - only show when expanded */}
              {expandedStep === step.id && <div className="mt-3 ml-8">{step.content}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
