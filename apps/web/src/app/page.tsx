import type { Metadata } from 'next';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { CTASection } from '@/components/landing/CTASection';
import { LandingFooter } from '@/components/landing/LandingFooter';
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
  metadataBase: new URL('https://www.floxen.ai'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Get Your Products in ChatGPT | Floxen',
    description:
      'Get your ecommerce products discovered in ChatGPT results. Show your products to hundreds of millions of AI shoppers.',
    url: 'https://www.floxen.ai/',
    siteName: 'Floxen',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Floxen - Show your products in ChatGPT',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Get Your Products in ChatGPT | Floxen',
    description:
      'Get your ecommerce products discovered in ChatGPT results. Show your products to hundreds of millions of AI shoppers.',
    images: ['/og-image.png'],
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

      {/* Skip link for accessibility */}
      <a
        href="#hero"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[60] focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow-lg focus:text-gray-900"
      >
        Skip to main content
      </a>

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
