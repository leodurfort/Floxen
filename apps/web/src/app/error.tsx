'use client';

export const dynamic = 'force-dynamic';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#0d0f1a] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">500</h1>
        <p className="text-white/60 mb-8">Something went wrong</p>
        <button
          onClick={() => reset()}
          className="text-blue-500 hover:underline"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
