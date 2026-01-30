export function MinimalHeader() {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto py-4 px-4 flex items-center gap-3">
        <a href="https://floxen.ai" className="flex-shrink-0">
          <img
            src="/logos/Floxen_logos/logo_orange.png"
            alt="Floxen"
            className="h-7 w-auto"
          />
        </a>
        <span className="badge bg-landing-primary-light text-landing-primary">
          Free Tool
        </span>
      </div>
    </header>
  );
}
