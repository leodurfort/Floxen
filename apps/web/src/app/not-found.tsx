export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0d0f1a] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <p className="text-white/60 mb-8">Page not found</p>
        <a href="/" className="text-blue-500 hover:underline">
          Go home
        </a>
      </div>
    </div>
  );
}
