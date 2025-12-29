'use client';

import { useState, useRef, useEffect } from 'react';

interface DescriptionPopoverProps {
  description: string;
  example?: string | null;
  values?: string | null;
  maxLength?: number;
}

export function DescriptionPopover({
  description,
  example,
  values,
  maxLength = 100,
}: DescriptionPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const isTruncated = description.length > maxLength;
  const truncatedText = isTruncated
    ? description.slice(0, maxLength).trim() + '...'
    : description;

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  if (!isTruncated && !example && !values) {
    // No need for popover - just show description
    return (
      <div>
        <p className="text-sm text-gray-600">{description}</p>
        {example && (
          <p className="text-xs text-gray-400 mt-1">Example: {example}</p>
        )}
        {values && (
          <p className="text-xs text-gray-400 mt-1">Values: {values}</p>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <p className="text-sm text-gray-600">
        {truncatedText}
        {isTruncated && (
          <button
            ref={triggerRef}
            onClick={() => setIsOpen(!isOpen)}
            className="ml-1 text-[#FA7315] hover:text-[#E5650F] text-xs font-medium"
          >
            (more)
          </button>
        )}
      </p>

      {/* Show example/values inline when not truncated but they exist */}
      {!isTruncated && (
        <>
          {example && (
            <p className="text-xs text-gray-400 mt-1">Example: {example}</p>
          )}
          {values && (
            <p className="text-xs text-gray-400 mt-1">Values: {values}</p>
          )}
        </>
      )}

      {/* Show popover with full content when truncated and clicked */}
      {isOpen && isTruncated && (
        <div
          ref={popoverRef}
          className="absolute left-0 top-full mt-2 z-50 w-80 p-4 bg-white border border-gray-200 rounded-lg shadow-xl"
        >
          {/* Full description */}
          <p className="text-sm text-gray-700">{description}</p>

          {/* Example */}
          {example && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs font-medium text-gray-500">Example:</span>
              <p className="text-xs text-gray-600 mt-0.5">{example}</p>
            </div>
          )}

          {/* Values */}
          {values && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs font-medium text-gray-500">Values:</span>
              <p className="text-xs text-gray-600 mt-0.5">{values}</p>
            </div>
          )}

          {/* Close button */}
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
