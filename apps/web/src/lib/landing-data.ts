// Landing page static data

export interface Testimonial {
  name: string;
  role: string;
  quote: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface PricingPlan {
  name: string;
  tier: 'FREE' | 'STARTER' | 'PRO';
  monthlyPrice: number;
  annualPrice: number;
  limit: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  ctaText: string;
}

export interface HowItWorksStep {
  icon: string;
  title: string;
  description: string;
}

export interface FeatureCard {
  icon: string;
  title: string;
  description: string;
}

// Testimonials from spec
export const testimonials: Testimonial[] = [
  {
    name: 'Marcus T.',
    role: 'WooCommerce Store Owner',
    quote:
      'Set up took 3 minutes. My products showed up in ChatGPT within an hour.',
  },
  {
    name: 'Jessica R.',
    role: 'Online Boutique Owner',
    quote:
      "I had no idea ChatGPT had shopping. Floxen got me listed before my competitors.",
  },
  {
    name: 'Daniel K.',
    role: 'E-commerce Manager',
    quote:
      'Finally, a simple way to get into AI search without hiring a developer.',
  },
];

// How It Works steps from spec
export const howItWorksSteps: HowItWorksStep[] = [
  {
    icon: 'link',
    title: 'Connect Your Store',
    description: 'Paste your store URL. No plugin required. Takes 30 seconds.',
  },
  {
    icon: 'check',
    title: 'Select Products',
    description: 'Choose which products to sync — or sync your entire catalog.',
  },
  {
    icon: 'robot',
    title: 'Appear in ChatGPT',
    description:
      'Your products are now discoverable by millions of AI shoppers.',
  },
];

// Feature cards from spec
export const featureCards: FeatureCard[] = [
  {
    icon: 'store',
    title: 'Store Connection',
    description: 'Connect your WooCommerce store in seconds.',
  },
  {
    icon: 'sync',
    title: 'Auto-Sync',
    description: 'Products automatically stay up to date.',
  },
  {
    icon: 'feed',
    title: 'Feed Generation',
    description: 'ChatGPT-ready product feeds.',
  },
];

// FAQ items from spec
export const faqItems: FAQItem[] = [
  {
    question: 'What is ChatGPT shopping?',
    answer:
      'ChatGPT now helps users discover and buy products through conversation. When someone asks "What\'s the best espresso machine under $200?", ChatGPT can recommend your products — if you\'re listed.',
  },
  {
    question: 'How does Floxen work?',
    answer:
      'Floxen connects to your WooCommerce store, reads your product catalog, and generates a feed that ChatGPT can understand. Your products become discoverable in AI conversations.',
  },
  {
    question: 'Do I need technical skills?',
    answer:
      'No. If you can copy your store URL and click "Authorize," you can set up Floxen in under 2 minutes.',
  },
  {
    question: 'How long until my products appear?',
    answer: 'Most stores see results within a few days after syncing.',
  },
  {
    question: 'What WooCommerce versions are supported?',
    answer: 'Floxen works with WooCommerce 5.0 and above.',
  },
  {
    question: 'Can I choose which products to sync?',
    answer:
      'Yes. You can sync your entire catalog or select specific products. Paid plans allow unlimited product selection.',
  },
  {
    question: 'Will this slow down my store?',
    answer:
      'No. Floxen syncs in the background using the WooCommerce REST API. Your storefront is unaffected.',
  },
  {
    question: 'What if I want to cancel?',
    answer:
      'Cancel anytime from your dashboard. You can downgrade to the Free plan (5 products) at any time.',
  },
];

// Pricing plans from spec
export const pricingPlans: PricingPlan[] = [
  {
    name: 'Free',
    tier: 'FREE',
    monthlyPrice: 0,
    annualPrice: 0,
    limit: '5 products',
    description: 'Perfect for trying out Floxen',
    features: [
      'Up to 5 products',
      'WooCommerce sync',
      'ChatGPT feed generation',
      'Chat support',
    ],
    ctaText: 'Free Forever',
  },
  {
    name: 'Starter',
    tier: 'STARTER',
    monthlyPrice: 25,
    annualPrice: 250,
    limit: '100 products',
    description: 'For growing stores',
    features: [
      'Up to 100 products',
      'WooCommerce sync',
      'ChatGPT feed generation',
      'Chat support',
      'Analytics (coming soon)',
    ],
    highlighted: true,
    ctaText: 'Get Started',
  },
  {
    name: 'Pro',
    tier: 'PRO',
    monthlyPrice: 37,
    annualPrice: 374,
    limit: 'Unlimited',
    description: 'For large catalogs',
    features: [
      'Unlimited products',
      'WooCommerce sync',
      'ChatGPT feed generation',
      'Chat support',
      'Analytics (coming soon)',
    ],
    ctaText: 'Get Started',
  },
];

// SEO structured data
export const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Floxen',
      description:
        'Connect your WooCommerce store to ChatGPT shopping. Get your products discovered by AI shoppers.',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: 'https://floxen.ai',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: 'Free for up to 5 products',
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: faqItems.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    },
    {
      '@type': 'Organization',
      name: 'Floxen',
      url: 'https://floxen.ai',
      logo: 'https://floxen.ai/logos/Floxen_logos/logo_orange.png',
    },
  ],
};
