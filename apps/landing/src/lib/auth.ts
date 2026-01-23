// Simplified auth check for landing site
// Reads from the same localStorage keys as the main app

export function getIsLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  const user = localStorage.getItem('floxen.user');
  return !!user;
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://app.floxen.ai';
}
