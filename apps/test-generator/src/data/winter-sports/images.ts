/**
 * Winter Sports Image URLs
 *
 * 14 product images that cycle across 50 products.
 * Images are served from the test-generator's public folder.
 */

// Base URL for the deployed test-generator app
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://test-generator-production-2ca3.up.railway.app';

// Image filenames
const WINTER_SPORTS_IMAGES = [
  'winter-01.png',
  'winter-02.png',
  'winter-03.png',
  'winter-04.png',
  'winter-05.png',
  'winter-06.png',
  'winter-07.png',
  'winter-08.png',
  'winter-09.png',
  'winter-10.png',
  'winter-11.png',
  'winter-12.png',
  'winter-13.png',
  'winter-14.png',
];

/**
 * Get an image URL for a winter sports product
 * Cycles through the 14 available images based on index
 */
export function getWinterSportsImageUrl(index: number): string {
  const imageIndex = index % WINTER_SPORTS_IMAGES.length;
  const filename = WINTER_SPORTS_IMAGES[imageIndex];
  return `${BASE_URL}/images/winter-sports/${filename}`;
}

/**
 * Get multiple image URLs for a product gallery
 * Returns 1-3 images cycling through available images
 */
export function getWinterSportsGallery(index: number, count = 1): string[] {
  const images: string[] = [];
  for (let i = 0; i < count; i++) {
    images.push(getWinterSportsImageUrl(index + i));
  }
  return images;
}

/**
 * Total number of unique winter sports images available
 */
export const WINTER_SPORTS_IMAGE_COUNT = WINTER_SPORTS_IMAGES.length;
