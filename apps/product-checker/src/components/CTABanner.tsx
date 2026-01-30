const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.floxen.ai';

export function CTABanner() {
  return (
    <section className="bg-landing-primary-light py-16 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-gray-900">
          Want to fix these issues automatically?
        </h2>
        <p className="mt-4 text-gray-600 text-lg">
          Floxen syncs your WooCommerce catalog to ChatGPT with full spec
          compliance.
        </p>
        <a
          href={`${appUrl}/register`}
          className="btn--primary inline-flex mt-6"
        >
          Get Started Free
        </a>
      </div>
    </section>
  );
}
