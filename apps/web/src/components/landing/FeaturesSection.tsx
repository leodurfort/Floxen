export function FeaturesSection() {
  return (
    <section id="features" className="py-16 md:py-24 relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#C05A30] via-[#E87B5A] to-[#9B4DCA] opacity-90" />

      <div className="landing-container relative z-10">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-4">
            See Floxen in Action
          </h2>
          <p className="text-white/80 max-w-2xl mx-auto">
            Watch how easy it is to get your products discovered by AI shoppers.
          </p>
        </div>

        {/* Demo video frame */}
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
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
    </section>
  );
}
