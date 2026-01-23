export function FeaturesSection() {
  return (
    <section id="features" className="py-16 md:py-24 bg-black">
      <div className="landing-container">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-4">
            See Floxen in Action
          </h2>
          <p className="text-white/70 max-w-2xl mx-auto">
            Watch how easy it is to get your products discovered by AI shoppers.
          </p>
        </div>

        {/* Gradient box with video */}
        <div className="max-w-6xl mx-auto">
          <div className="relative rounded-2xl p-0 md:p-12 overflow-hidden">
            {/* Gradient background with opacity */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#C05A30] via-[#E87B5A] to-[#9B4DCA] opacity-70" />

            {/* Video container */}
            <div className="relative z-10 md:max-w-5xl mx-auto">
              <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-auto"
                  aria-label="Floxen platform demo showing product sync and ChatGPT feed generation"
                >
                  <source src="/videos/demo_landing.webm" type="video/webm" />
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
