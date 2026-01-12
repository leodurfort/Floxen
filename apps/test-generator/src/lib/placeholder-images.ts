/**
 * Placeholder image generation utilities
 *
 * Uses placehold.co which provides reliable placeholder images
 * that WooCommerce can fetch and import.
 */

// Colors for different categories
const CATEGORY_COLORS: Record<string, string> = {
  't-shirts': 'E8E8E8',
  hoodies: 'D0D0D0',
  jackets: 'C8C8C8',
  pants: 'B8B8B8',
  shorts: 'A8A8A8',
  sneakers: '989898',
  boots: '888888',
  sandals: '787878',
  hats: '686868',
  bags: '585858',
  belts: '484848',
};

const TEXT_COLOR = '333333';

/**
 * Generate a placeholder image URL
 * Uses placehold.co format: https://placehold.co/WIDTHxHEIGHT/BGCOLOR/TEXTCOLOR.png
 */
export function getPlaceholderUrl(
  sku: string,
  category: string,
  size = '800x800'
): string {
  const bgColor = CATEGORY_COLORS[category] || 'CCCCCC';

  // Use placehold.co which WooCommerce can reliably fetch
  // Format: https://placehold.co/800x800/BGCOLOR/TEXTCOLOR.png
  return `https://placehold.co/${size}/${bgColor}/${TEXT_COLOR}.png`;
}

/**
 * Generate multiple placeholder URLs for a product gallery
 */
export function getPlaceholderGallery(
  sku: string,
  category: string,
  count = 3
): string[] {
  const images: string[] = [];

  // Main image (larger)
  images.push(getPlaceholderUrl(sku, category, '800x800'));

  // Additional gallery images
  for (let i = 1; i < count; i++) {
    images.push(getPlaceholderUrl(`${sku}-${i}`, category, '600x600'));
  }

  return images;
}

/**
 * Generate thumbnail URL
 */
export function getThumbnailUrl(sku: string, category: string): string {
  return getPlaceholderUrl(sku, category, '300x300');
}
