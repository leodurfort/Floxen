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
              shopping results.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start mb-4">
              <Link href="/register" className="btn--landing-primary">
                Get My Products in ChatGPT
              </Link>
            </div>
            <p className="text-sm text-gray-500">No credit card required.</p>
          </div>

          {/* Right: Demo Video */}
          <div className="relative">
            {/* Outer frame with rounded corners and brand color */}
            <div className="bg-landing-primary rounded-2xl p-3 shadow-xl">
              {/* Inner video container with sharp corners */}
              <div className="aspect-video bg-white overflow-hidden">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-contain"
                  aria-label="Demo video showing products appearing in ChatGPT shopping results"
                >
                  <source src="/logos/hero_demo.webm" type="video/webm" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
