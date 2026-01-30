'use client';

import { useState, useRef, useCallback } from 'react';
import clsx from 'clsx';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'What is ChatGPT Shopping?',
    answer:
      "OpenAI's commerce feature that lets ChatGPT recommend and link to products directly in conversations.",
  },
  {
    question: 'What does this checker validate?',
    answer:
      "We analyze your product page against OpenAI's 70-field commerce specification across 15 categories including product data, pricing, availability, media, and more.",
  },
  {
    question: 'How do I fix the issues found?',
    answer:
      'Add structured data (JSON-LD with schema.org Product type) to your product pages. This is the most reliable way for ChatGPT to understand your products.',
  },
  {
    question: 'Is this tool free?',
    answer:
      'Yes, completely free with no signup required. You get instant results directly on the page.',
  },
  {
    question: 'How is the score calculated?',
    answer:
      'Fields are weighted by importance: Required fields count 3x, Recommended 2x, Conditional 1.5x, and Optional 1x. Your score reflects how well your page covers the full specification.',
  },
  {
    question: "Why wasn't my product data detected?",
    answer:
      "This tool fetches your page the same way search engines and ChatGPT do \u2014 as static HTML. If your product data only renders via JavaScript, it won't be visible to ChatGPT Shopping either. Consider adding server-rendered structured data.",
  },
];

export function ToolFAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const setButtonRef = useCallback(
    (index: number) => (el: HTMLButtonElement | null) => {
      buttonRefs.current[index] = el;
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      const totalItems = FAQ_ITEMS.length;
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
    },
    []
  );

  return (
    <section className="tool-section">
      <div className="tool-container">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-gray-900 text-center mb-8">
          Frequently Asked Questions
        </h2>

        <div
          className="max-w-3xl mx-auto divide-y divide-gray-200"
          role="region"
          aria-label="Frequently Asked Questions"
        >
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;
            const buttonId = `tool-faq-button-${index}`;
            const panelId = `tool-faq-panel-${index}`;

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
                    className={clsx(
                      'flex-shrink-0 transition-transform duration-200',
                      isOpen && 'rotate-180'
                    )}
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
                  className={clsx(
                    'overflow-hidden transition-all duration-200',
                    isOpen && 'mt-2'
                  )}
                >
                  <p className="text-gray-600 leading-relaxed pr-8">
                    {item.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
