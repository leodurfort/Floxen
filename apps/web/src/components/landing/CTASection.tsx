import Link from 'next/link';

export function CTASection() {
  return (
    <section id="cta" className="landing-section landing-section--alt">
      <div className="landing-container">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-gray-900 mb-6">
            Ready to reach ChatGPT users?
          </h2>
          <Link href="/register" className="btn--landing-primary">
            Get My Products in ChatGPT
          </Link>
        </div>
      </div>
    </section>
  );
}
