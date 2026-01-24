import type { Metadata } from 'next';
import { LandingHeader } from '@/components/LandingHeader';
import { HeroSection } from '@/components/HeroSection';
import { HowItWorksSection } from '@/components/HowItWorksSection';
import { FeaturesSection } from '@/components/FeaturesSection';
import { PricingSection } from '@/components/PricingSection';
import { FAQSection } from '@/components/FAQSection';
import { CTASection } from '@/components/CTASection';
import { LandingFooter } from '@/components/LandingFooter';
import { structuredData } from '@/lib/landing-data';

// SEO Metadata
export const metadata: Metadata = {
  title: 'Get Your Products in ChatGPT | Floxen',
  description:
    'Get your ecommerce products discovered in ChatGPT results. Show your products to hundreds of millions of AI shoppers. Free for up to 5 products. No credit card required.',
  keywords: [
    'show products in chatgpt',
    'chatgpt shopping',
    'woocommerce chatgpt',
    'AI product discovery',
    'chatgpt product feed generator',
  ],
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
  },
};

// Static generation for performance
export const dynamic = 'force-static';
export const revalidate = 3600; // Revalidate every hour

export default function LandingPage() {
  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />

      <div className="landing-page">
        <LandingHeader />
        <main>
          <HeroSection />
          <HowItWorksSection />
          <FeaturesSection />
          <PricingSection />
          <FAQSection />
          <CTASection />
        </main>
        <LandingFooter />
      </div>
    </>
  );
}
