/**
 * Feed Types for Test Data Generator v2
 *
 * Supports multiple feed configurations:
 * - comprehensive: ~500 products across 11 categories (original)
 * - winter-sports: 50 ski/snowboard products with all required fields
 */

export type FeedType = 'comprehensive' | 'winter-sports';

export interface FeedConfig {
  id: FeedType;
  name: string;
  description: string;
  productCount: number;
  categories: string[];
  features: string[];
}

export const FEED_CONFIGS: Record<FeedType, FeedConfig> = {
  comprehensive: {
    id: 'comprehensive',
    name: 'Comprehensive Feed',
    description: '~500 products across 11 categories with edge cases, variations, and relationships',
    productCount: 500,
    categories: [
      'T-shirts',
      'Hoodies',
      'Jackets',
      'Pants',
      'Shorts',
      'Sneakers',
      'Boots',
      'Sandals',
      'Hats',
      'Bags',
      'Belts',
    ],
    features: [
      'Simple, variable, and grouped products',
      'Multiple brand storage methods',
      'Edge cases for testing',
      'Product relationships (cross-sell, upsell)',
      'Reviews with various ratings',
    ],
  },
  'winter-sports': {
    id: 'winter-sports',
    name: 'Winter Sports Feed',
    description: '50 ski & snowboard products optimized for all 17 required feed fields',
    productCount: 50,
    categories: ['Skis', 'Snowboards'],
    features: [
      'All 17 required fields populated',
      'Simple products only',
      '25 ski + 25 snowboard products',
      'Realistic materials and weights',
      'Clean data for feed validation',
    ],
  },
};

/**
 * Get feed config by type
 */
export function getFeedConfig(feedType: FeedType): FeedConfig {
  return FEED_CONFIGS[feedType];
}

/**
 * Get all available feed types
 */
export function getAvailableFeedTypes(): FeedType[] {
  return Object.keys(FEED_CONFIGS) as FeedType[];
}
