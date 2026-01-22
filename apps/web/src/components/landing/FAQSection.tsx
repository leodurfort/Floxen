import { faqItems } from '@/lib/landing-data';
import { FAQAccordion } from './FAQAccordion';

export function FAQSection() {
  return (
    <section id="faq" className="landing-section">
      <div className="landing-container">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Everything you need to know about getting your products on ChatGPT.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto">
          <FAQAccordion items={faqItems} />
        </div>
      </div>
    </section>
  );
}
