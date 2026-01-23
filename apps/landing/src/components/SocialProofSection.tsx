import { testimonials } from '@/lib/landing-data';
import { TestimonialCard } from './TestimonialCard';

export function SocialProofSection() {
  return (
    <section id="social-proof" className="landing-section landing-section--alt">
      <div className="landing-container">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            Trusted by WooCommerce Store Owners
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            See what our customers have to say about getting their products
            discovered on ChatGPT.
          </p>
        </div>

        {/* Testimonials grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={index} testimonial={testimonial} />
          ))}
        </div>
      </div>
    </section>
  );
}
