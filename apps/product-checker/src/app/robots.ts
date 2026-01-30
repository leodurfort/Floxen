import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://product.floxen.ai';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
      // Explicitly allow AI crawlers
      {
        userAgent: ['GPTBot', 'ChatGPT-User', 'OAI-SearchBot'],
        allow: '/',
        disallow: ['/api/'],
      },
      {
        userAgent: ['ClaudeBot', 'anthropic-ai'],
        allow: '/',
        disallow: ['/api/'],
      },
      {
        userAgent: ['Google-Extended', 'Googlebot'],
        allow: '/',
        disallow: ['/api/'],
      },
      {
        userAgent: ['Bingbot', 'PerplexityBot', 'Applebot', 'Amazonbot'],
        allow: '/',
        disallow: ['/api/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
