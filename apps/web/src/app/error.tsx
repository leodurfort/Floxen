'use client';

export const dynamic = 'force-dynamic';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">500</h1>
        <p className="text-gray-600 mb-8">Something went wrong</p>
        <button
          onClick={() => reset()}
          className="text-[#FA7315] hover:underline"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
