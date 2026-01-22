import Link from 'next/link';

export function CTASection() {
  return (
    <section id="cta" className="landing-section landing-section--alt">
      <div className="landing-container">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-gray-900 mb-6">
            Ready to reach AI shoppers?
          </h2>
          <Link href="/register" className="btn--landing-primary">
            Get My Products in ChatGPT
          </Link>
          <p className="text-sm text-gray-500 mt-4">
            Free for up to 5 products. No credit card required.
          </p>
        </div>
      </div>
    </section>
  );
}
