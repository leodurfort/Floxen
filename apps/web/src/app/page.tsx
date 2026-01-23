import { redirect } from 'next/navigation';

// Root of app subdomain redirects to dashboard
// Middleware handles this in production, but this is a fallback for development
// Unauthenticated users will be redirected to login by AppLayout
export default function RootPage() {
  redirect('/dashboard');
}
