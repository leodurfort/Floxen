import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Floxen',
  description: 'Terms of Service for Floxen - WooCommerce to ChatGPT integration',
  metadataBase: new URL('https://www.floxen.ai'),
  alternates: {
    canonical: '/terms',
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href="/" className="inline-block">
            <img
              src="/logos/Floxen_logos/logo_orange.png"
              alt="Floxen"
              className="h-8 w-auto"
            />
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-gray-500 mb-8">Last updated: January 2026</p>

        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 mb-6">
            Welcome to Floxen. These Terms of Service (&quot;Terms&quot;) govern your access to and use of
            Floxen&apos;s services, including our website and platform (collectively, the &quot;Service&quot;).
            By accessing or using the Service, you agree to be bound by these Terms.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. The Service</h2>
          <p className="text-gray-600 mb-4">
            Floxen provides a cloud-based platform that enables WooCommerce store owners to synchronize
            their product catalogs with ChatGPT, making their products discoverable by AI shoppers.
          </p>
          <p className="text-gray-600 mb-4">
            The Service is provided on a subscription basis. You may authorize users to access the
            Service on your behalf, and you are responsible for their compliance with these Terms.
          </p>
          <p className="text-gray-600 mb-4">
            Floxen retains all intellectual property rights in the Service, including all software,
            designs, and documentation.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. Account Registration</h2>
          <p className="text-gray-600 mb-4">
            To use the Service, you must create an account and provide accurate, complete information.
            You are responsible for maintaining the confidentiality of your account credentials and
            for all activities that occur under your account.
          </p>
          <p className="text-gray-600 mb-4">
            You must notify us immediately of any unauthorized use of your account or any other
            breach of security.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. Restrictions</h2>
          <p className="text-gray-600 mb-4">You agree not to:</p>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
            <li>Use the Service for any unlawful purpose or in violation of any applicable laws</li>
            <li>Attempt to gain unauthorized access to the Service or its related systems</li>
            <li>Use the Service to compete with Floxen or for competitive analysis</li>
            <li>Resell, sublicense, or transfer your rights to the Service without authorization</li>
          </ul>
          <p className="text-gray-600 mb-4">
            Floxen reserves the right to suspend or terminate your access if your use of the Service
            significantly harms our operations or other users.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. Third-Party Services</h2>
          <p className="text-gray-600 mb-4">
            The Service integrates with third-party platforms including WooCommerce and OpenAI/ChatGPT.
            Floxen does not endorse or guarantee these third-party services and is not liable for
            their availability, accuracy, or performance.
          </p>
          <p className="text-gray-600 mb-4">
            Your use of third-party services is subject to their respective terms and policies.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5. Fees and Payment</h2>
          <p className="text-gray-600 mb-4">
            Certain features of the Service require a paid subscription. By subscribing to a paid
            plan, you agree to pay the applicable fees as described on our pricing page.
          </p>
          <p className="text-gray-600 mb-4">
            Subscription fees are billed in advance on a monthly or annual basis and are non-refundable
            except as required by law or as explicitly stated in these Terms.
          </p>
          <p className="text-gray-600 mb-4">
            Floxen reserves the right to modify fees upon 30 days&apos; notice. Continued use of the
            Service after fee changes constitutes acceptance of the new fees.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">6. Term and Termination</h2>
          <p className="text-gray-600 mb-4">
            These Terms remain in effect until terminated. You may terminate your account at any time
            by contacting us or through your account settings.
          </p>
          <p className="text-gray-600 mb-4">
            Floxen may terminate or suspend your access immediately if you breach these Terms or if
            required by law. Upon termination, your right to use the Service ceases immediately.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">7. Disclaimers</h2>
          <p className="text-gray-600 mb-4">
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
            EXPRESS OR IMPLIED. FLOXEN DISCLAIMS ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF
            MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>
          <p className="text-gray-600 mb-4">
            Floxen does not guarantee that your products will appear in ChatGPT search results or
            that the Service will be uninterrupted or error-free.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">8. Limitation of Liability</h2>
          <p className="text-gray-600 mb-4">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, FLOXEN SHALL NOT BE LIABLE FOR ANY INDIRECT,
            INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR
            REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY.
          </p>
          <p className="text-gray-600 mb-4">
            In no event shall Floxen&apos;s total liability exceed the amount paid by you to Floxen
            during the twelve (12) months preceding the claim.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">9. Data Protection</h2>
          <p className="text-gray-600 mb-4">
            Floxen maintains reasonable security measures to protect your data. Our collection and
            use of personal information is described in our{' '}
            <Link href="/privacy" className="text-landing-primary hover:underline">
              Privacy Policy
            </Link>
            .
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">10. Changes to Terms</h2>
          <p className="text-gray-600 mb-4">
            Floxen may modify these Terms at any time by posting the revised Terms on our website.
            We will provide at least 30 days&apos; notice of material changes. Your continued use of
            the Service after such changes constitutes acceptance of the modified Terms.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">11. Governing Law</h2>
          <p className="text-gray-600 mb-4">
            These Terms shall be governed by and construed in accordance with the laws of France,
            without regard to its conflict of law provisions.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">12. Contact Us</h2>
          <p className="text-gray-600 mb-4">
            If you have any questions about these Terms, please contact us at:{' '}
            <a href="mailto:contact@floxen.ai" className="text-landing-primary hover:underline">
              contact@floxen.ai
            </a>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 flex justify-between items-center">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Floxen. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link href="/privacy" className="text-gray-500 hover:text-gray-700 text-sm">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-gray-500 hover:text-gray-700 text-sm">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
