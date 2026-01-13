/**
 * Brand definitions for the WooCommerce Test Data Generator
 * 10 fictional brands with distinct styles
 */

export interface BrandDefinition {
  key: string;
  name: string;
  style: string;
  categories: string[]; // Preferred categories for this brand
}

export const BRANDS: Record<string, BrandDefinition> = {
  // PRD Section 7.2 - 10 Fictional Brands
  URBAN_THREAD: {
    key: 'URBAN_THREAD',
    name: 'UrbanThread',
    style: 'Streetwear, casual, trendy',
    categories: ['t-shirts', 'hoodies', 'sneakers', 'hats'],
  },
  NORTH_PEAK: {
    key: 'NORTH_PEAK',
    name: 'NorthPeak',
    style: 'Outdoor, performance, durable',
    categories: ['jackets', 'boots', 'pants', 'bags'],
  },
  VELVET_STRIDE: {
    key: 'VELVET_STRIDE',
    name: 'VelvetStride',
    style: 'Premium, luxury, elegant',
    categories: ['pants', 'belts', 't-shirts', 'jackets', 'sandals'],
  },
  COASTAL_BREEZE: {
    key: 'COASTAL_BREEZE',
    name: 'CoastalBreeze',
    style: 'Summer, beachwear, relaxed',
    categories: ['shorts', 'sandals', 't-shirts', 'hats'],
  },
  IRON_FORGE: {
    key: 'IRON_FORGE',
    name: 'IronForge',
    style: 'Industrial, workwear, rugged',
    categories: ['boots', 'pants', 'jackets', 'belts'],
  },
  ZEN_FLOW: {
    key: 'ZEN_FLOW',
    name: 'ZenFlow',
    style: 'Wellness, yoga, comfort',
    categories: ['shorts', 'sneakers', 't-shirts', 'hoodies'],
  },
  METRO_STYLE: {
    key: 'METRO_STYLE',
    name: 'MetroStyle',
    style: 'Urban, sophisticated, modern',
    categories: ['pants', 'jackets', 'bags', 'belts'],
  },
  WILD_TRAIL: {
    key: 'WILD_TRAIL',
    name: 'WildTrail',
    style: 'Outdoor, hiking, adventure',
    categories: ['boots', 'jackets', 'pants', 'bags', 'sandals'],
  },
  SILK_HAVEN: {
    key: 'SILK_HAVEN',
    name: 'SilkHaven',
    style: 'Luxury, elegant, refined',
    categories: ['t-shirts', 'jackets', 'pants', 'hats'],
  },
  STREET_PULSE: {
    key: 'STREET_PULSE',
    name: 'StreetPulse',
    style: 'Urban, edgy, streetwear',
    categories: ['hoodies', 'sneakers', 'hats', 'bags'],
  },
};

export const BRAND_LIST = Object.values(BRANDS);

/**
 * Get a random brand for a given category
 */
export function getBrandForCategory(category: string): BrandDefinition {
  const matchingBrands = BRAND_LIST.filter((b) =>
    b.categories.includes(category)
  );
  if (matchingBrands.length === 0) {
    return BRAND_LIST[Math.floor(Math.random() * BRAND_LIST.length)];
  }
  return matchingBrands[Math.floor(Math.random() * matchingBrands.length)];
}
