import type { Metadata } from 'next';
import { LandingHeader } from '@/components/LandingHeader';
import { PricingSection } from '@/components/PricingSection';
import { FAQSection } from '@/components/FAQSection';
import { CTASection } from '@/components/CTASection';
import { LandingFooter } from '@/components/LandingFooter';

export const metadata: Metadata = {
  title: 'Pricing | Floxen',
  description:
    'Simple, transparent pricing for Floxen. Get your products in ChatGPT for free with up to 5 products. Scale with our Starter and Pro plans.',
  alternates: {
    canonical: '/pricing',
  },
  openGraph: {
    title: 'Pricing | Floxen',
    description:
      'Simple, transparent pricing for Floxen. Get your products in ChatGPT for free with up to 5 products.',
    url: 'https://floxen.ai/pricing',
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
};

// Static generation for performance
export const dynamic = 'force-static';
export const revalidate = 3600;

export default function PricingPage() {
  return (
    <div className="landing-page">
      <LandingHeader />
      <main className="pt-20">
        <PricingSection />
        <FAQSection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
