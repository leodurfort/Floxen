'use client';

interface NoDataFoundProps {
  url: string;
}

export function NoDataFound({ url }: NoDataFoundProps) {
  return (
    <div className="bg-white rounded-2xl border-l-4 border-amber-400 shadow-sm p-6">
      <div className="flex items-start gap-4">
        {/* Warning icon */}
        <div className="flex-shrink-0 mt-0.5">
          <svg
            className="w-6 h-6 text-amber-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900">
            No Product Data Found
          </h3>

          <p className="mt-2 text-gray-600">
            We couldn&apos;t find structured product data on this page. This
            means ChatGPT Shopping likely can&apos;t see your product either.
          </p>

          <p className="mt-1 text-sm text-gray-400 truncate">{url}</p>

          <div className="mt-5">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Tips to improve visibility:
            </h4>
            <ol className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-amber-600 flex-shrink-0">
                  1.
                </span>
                Add JSON-LD structured data with schema.org Product type
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-amber-600 flex-shrink-0">
                  2.
                </span>
                Include Open Graph product meta tags
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-amber-600 flex-shrink-0">
                  3.
                </span>
                Ensure product data is server-rendered, not client-side only
              </li>
            </ol>
          </div>

          <div className="mt-5">
            <a
              href="https://schema.org/Product"
              target="_blank"
              rel="noopener noreferrer"
              className="btn--outline inline-flex text-sm py-2.5 px-4"
            >
              Learn More About Structured Data
              <svg
                className="w-4 h-4 ml-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
