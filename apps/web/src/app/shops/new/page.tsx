import { redirect } from 'next/navigation';

// This page is deprecated - shop creation is handled via modal on /shops
// Redirect to /shops to prevent broken links
export default function NewShopPage() {
  redirect('/shops');
}
