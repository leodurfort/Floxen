import { howItWorksSteps } from '@/lib/landing-data';

function StepIcon({ icon }: { icon: string }) {
  switch (icon) {
    case 'link':
      return (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
      );
    case 'check':
      return (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case 'robot':
      return (
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      );
    default:
      return null;
  }
}

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="landing-section landing-section--alt">
      <div className="landing-container">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Get your products in front of ChatGPT users in three simple steps.
          </p>
        </div>

        {/* Steps grid with arrows */}
        <div className="grid md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 md:gap-6 max-w-4xl mx-auto mb-12 items-start">
          {howItWorksSteps.map((step, index) => (
            <>
              <div key={index} className="text-center">
                {/* Step number and icon */}
                <div className="relative inline-flex items-center justify-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-landing-primary/10 flex items-center justify-center text-landing-primary">
                    <StepIcon icon={step.icon} />
                  </div>
                  {/* Step number badge */}
                  <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-landing-primary text-white text-sm font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                </div>

                {/* Step content */}
                <h3 className="font-display text-xl font-bold text-gray-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600">{step.description}</p>
              </div>

              {/* Arrow connector - desktop only */}
              {index < howItWorksSteps.length - 1 && (
                <div className="hidden md:flex items-center justify-center pt-8">
                  <svg
                    className="w-8 h-8 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              )}
            </>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <a href="https://app.floxen.ai/register" className="btn--landing-outline">
            Get My Products in ChatGPT
          </a>
        </div>
      </div>
    </section>
  );
}
