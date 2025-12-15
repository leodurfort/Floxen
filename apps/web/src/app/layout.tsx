import type { Metadata } from 'next';
import { Manrope, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { AppLayout } from '@/components/AppLayout';

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
  title: 'ProductSynch',
  description: 'Sync WooCommerce catalogs to OpenAI product feeds with AI enrichment.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} font-body`}>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
