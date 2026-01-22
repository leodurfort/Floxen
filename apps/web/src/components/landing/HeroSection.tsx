import Link from 'next/link';

export function HeroSection() {
  return (
    <section
      id="hero"
      className="landing-section pt-24 md:pt-32 md:min-h-[calc(100vh-80px)] flex items-center"
    >
      <div className="landing-container">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left: Copy */}
          <div className="text-center md:text-left">
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
              Billions of visits on ChatGPT.{' '}
              <span className="text-landing-primary">
                Are Your Products There?
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-xl mx-auto md:mx-0">
              Connect your WooCommerce store and start appearing in ChatGPT
              shopping results today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start mb-4">
              <Link href="/register" className="btn--landing-primary">
                Get My Products in ChatGPT
              </Link>
            </div>
            <p className="text-sm text-gray-500">
              Free for up to 5 products. No credit card required.
            </p>
          </div>

          {/* Right: Video/GIF Placeholder */}
          <div className="relative order-first md:order-last">
            <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden shadow-xl border border-gray-200">
              {/* Placeholder for video/GIF - replace with actual asset */}
              <div className="w-full h-full flex flex-col items-center justify-center p-8">
                <div className="w-16 h-16 mb-4 rounded-full bg-landing-primary/10 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-landing-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <span className="text-gray-400 text-sm text-center">
                  Demo video showing products in ChatGPT
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
