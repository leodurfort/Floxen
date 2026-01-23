'use client';

import { useState, useRef, useCallback } from 'react';
import type { FAQItem } from '@/lib/landing-data';

interface FAQAccordionProps {
  items: FAQItem[];
}

export function FAQAccordion({ items }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const setButtonRef = useCallback(
    (index: number) => (el: HTMLButtonElement | null) => {
      buttonRefs.current[index] = el;
    },
    []
  );

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    const totalItems = items.length;
    let targetIndex: number | null = null;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        targetIndex = (index + 1) % totalItems;
        break;
      case 'ArrowUp':
        e.preventDefault();
        targetIndex = (index - 1 + totalItems) % totalItems;
        break;
      case 'Home':
        e.preventDefault();
        targetIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        targetIndex = totalItems - 1;
        break;
    }

    if (targetIndex !== null) {
      buttonRefs.current[targetIndex]?.focus();
    }
  };

  return (
    <div className="divide-y divide-gray-200" role="region" aria-label="FAQ">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const buttonId = `faq-button-${index}`;
        const panelId = `faq-panel-${index}`;

        return (
          <div key={index} className="py-4">
            <button
              id={buttonId}
              ref={setButtonRef(index)}
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpenIndex(isOpen ? null : index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className="w-full text-left flex justify-between items-center gap-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-primary rounded-lg py-2"
            >
              <span className="font-medium text-gray-900 text-lg">
                {item.question}
              </span>
              <span
                className={`flex-shrink-0 transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              >
                <svg
                  className="w-5 h-5 text-gray-500"
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
              </span>
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className={`overflow-hidden transition-all duration-200 ${
                isOpen ? 'mt-2' : ''
              }`}
            >
              <p className="text-gray-600 leading-relaxed pr-8">{item.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
