import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Floxen',
  description: 'Privacy Policy for Floxen - WooCommerce to ChatGPT integration',
  alternates: {
    canonical: '/privacy',
  },
};

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 mb-8">Last updated: January 2026</p>

        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 mb-6">
            At Floxen, we are committed to protecting your privacy and handling your data with
            transparency. This Privacy Policy explains how we collect, use, and protect your
            information when you use our Service.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">1. Information We Collect</h2>

          <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">Account Information</h3>
          <p className="text-gray-600 mb-4">
            When you create an account, we collect:
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li>Name and email address</li>
            <li>Password (encrypted)</li>
            <li>Company or store name</li>
            <li>Payment information (processed securely by our payment provider)</li>
          </ul>

          <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">Store Data</h3>
          <p className="text-gray-600 mb-4">
            When you connect your WooCommerce store, we access:
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li>Product information (names, descriptions, prices, images, categories)</li>
            <li>Store URL and API credentials</li>
          </ul>
          <p className="text-gray-600 mb-4">
            We do not access or store customer data from your WooCommerce store (such as orders,
            customer names, or payment information).
          </p>

          <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">Usage Data</h3>
          <p className="text-gray-600 mb-4">
            We automatically collect technical information including:
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li>IP address and browser type</li>
            <li>Pages visited and features used</li>
            <li>Device information and operating system</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">2. How We Use Your Information</h2>
          <p className="text-gray-600 mb-4">We use the collected information to:</p>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li>Provide and maintain the Service</li>
            <li>Synchronize your products with ChatGPT shopping feeds</li>
            <li>Process payments and manage subscriptions</li>
            <li>Send service-related communications</li>
            <li>Improve and optimize the Service</li>
            <li>Respond to support requests</li>
            <li>Comply with legal obligations</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">3. Data Sharing</h2>
          <p className="text-gray-600 mb-4">
            <strong>We do not sell your personal information.</strong>
          </p>
          <p className="text-gray-600 mb-4">We may share your information with:</p>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li>
              <strong>Service Providers:</strong> Third-party services that help us operate the
              Service (hosting, payment processing, analytics)
            </li>
            <li>
              <strong>ChatGPT/OpenAI:</strong> Product data is shared to enable discovery in
              ChatGPT shopping results
            </li>
            <li>
              <strong>Legal Requirements:</strong> When required by law or to protect our rights
            </li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">4. Data Security</h2>
          <p className="text-gray-600 mb-4">
            We implement industry-standard security measures to protect your data, including:
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li>Encryption of data in transit (TLS/SSL) and at rest</li>
            <li>Secure cloud infrastructure</li>
            <li>Access controls and authentication</li>
            <li>Regular security assessments</li>
          </ul>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">5. Data Retention</h2>
          <p className="text-gray-600 mb-4">
            We retain your data for as long as your account is active or as needed to provide the
            Service. If you delete your account, we will delete or anonymize your data within 30
            days, except where we are required to retain it for legal purposes.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">6. Your Rights</h2>
          <p className="text-gray-600 mb-4">
            Depending on your location, you may have the right to:
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li>Access the personal data we hold about you</li>
            <li>Correct inaccurate information</li>
            <li>Request deletion of your data</li>
            <li>Object to or restrict processing</li>
            <li>Data portability</li>
            <li>Withdraw consent where applicable</li>
          </ul>
          <p className="text-gray-600 mb-4">
            To exercise these rights, please contact us at{' '}
            <a href="mailto:privacy@floxen.ai" className="text-landing-primary hover:underline">
              privacy@floxen.ai
            </a>
            .
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">7. International Transfers</h2>
          <p className="text-gray-600 mb-4">
            Your data may be processed in countries outside your own, including the United States
            and European Union. We ensure appropriate safeguards are in place, including standard
            contractual clauses where required.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">8. Cookies</h2>
          <p className="text-gray-600 mb-4">
            We use cookies and similar technologies to improve your experience, analyze usage, and
            provide personalized content. You can manage cookie preferences through your browser
            settings.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">9. Children&apos;s Privacy</h2>
          <p className="text-gray-600 mb-4">
            The Service is not intended for children under 16. We do not knowingly collect
            information from children. If you believe we have collected data from a child, please
            contact us immediately.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">10. Changes to This Policy</h2>
          <p className="text-gray-600 mb-4">
            We may update this Privacy Policy from time to time. We will notify you of material
            changes by posting the new policy on our website and updating the &quot;Last updated&quot; date.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-4">11. Contact Us</h2>
          <p className="text-gray-600 mb-4">
            If you have questions about this Privacy Policy or our data practices, please contact us:
          </p>
          <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
            <li>
              Email:{' '}
              <a href="mailto:privacy@floxen.ai" className="text-landing-primary hover:underline">
                privacy@floxen.ai
              </a>
            </li>
            <li>
              General inquiries:{' '}
              <a href="mailto:contact@floxen.ai" className="text-landing-primary hover:underline">
                contact@floxen.ai
              </a>
            </li>
          </ul>
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
