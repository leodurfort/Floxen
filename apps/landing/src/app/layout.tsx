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

export const metadata: Metadata = {
  metadataBase: new URL('https://floxen.ai'),
  title: 'Floxen - Get Your Products in ChatGPT',
  description:
    'Connect your WooCommerce store to ChatGPT shopping. Sync your product catalog and reach millions of AI shoppers.',
  icons: {
    icon: '/logos/Floxen_logos/favicon_orange-32x32.png',
    apple: '/logos/Floxen_logos/favicon_orange-32x32.png',
  },
  openGraph: {
    title: 'Floxen - Get Your Products in ChatGPT',
    description:
      'Connect your WooCommerce store to ChatGPT shopping. Sync your product catalog and reach millions of AI shoppers.',
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} font-body`}>{children}</body>
    </html>
  );
}
