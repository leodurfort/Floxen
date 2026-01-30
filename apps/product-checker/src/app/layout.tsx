import type { Metadata } from 'next';
import { Manrope, Space_Grotesk } from 'next/font/google';
import './globals.css';

const display = Space_Grotesk({
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
});

const body = Manrope({
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://product.floxen.ai';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Free ChatGPT Product Visibility Checker | Floxen',
  description:
    'Check if your product pages are optimized for ChatGPT Shopping. Free instant analysis against OpenAI\'s 70-field commerce specification.',
  icons: {
    icon: '/logos/Floxen_logos/favicon_orange-32x32.png',
    apple: '/logos/Floxen_logos/favicon_orange-32x32.png',
  },
  openGraph: {
    title: 'Free ChatGPT Product Visibility Checker | Floxen',
    description:
      'Check if your product pages are optimized for ChatGPT Shopping. Free instant analysis against OpenAI\'s 70-field commerce specification.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Floxen ChatGPT Product Visibility Checker',
      },
    ],
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} font-body`}>
        {children}
      </body>
    </html>
  );
}
