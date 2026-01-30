import type { Metadata } from 'next';
import { MinimalHeader } from '@/components/MinimalHeader';
import { MinimalFooter } from '@/components/MinimalFooter';
import { VisibilityCheckerTool } from '@/components/VisibilityCheckerTool';
import { ToolFAQSection } from '@/components/ToolFAQSection';
import { CTABanner } from '@/components/CTABanner';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://product.floxen.ai';

export const metadata: Metadata = {
  title: 'Free ChatGPT Product Visibility Checker | Floxen',
  description:
    'Check if your product pages are optimized for ChatGPT Shopping. Free instant analysis against OpenAI\'s 70-field commerce specification.',
  keywords: [
    'chatgpt product checker',
    'chatgpt shopping optimization',
    'openai commerce spec',
    'product visibility checker',
    'chatgpt product feed',
    'ai shopping readiness',
  ],
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
  },
};

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'ChatGPT Product Visibility Checker',
  description:
    'Free tool to check if your product pages are optimized for ChatGPT Shopping. Validates against OpenAI\'s 70-field commerce specification.',
  url: siteUrl,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Any',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  creator: {
    '@type': 'Organization',
    name: 'Floxen',
    url: 'https://floxen.ai',
  },
};

export default function ProductCheckerPage() {
  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />

      <div className="tool-page">
        <MinimalHeader />
        <main>
          <VisibilityCheckerTool />
          <ToolFAQSection />
          <CTABanner />
        </main>
        <MinimalFooter />
      </div>
    </>
  );
}
