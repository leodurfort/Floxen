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
  CLASSIC_FIT: {
    key: 'CLASSIC_FIT',
    name: 'ClassicFit',
    style: 'Traditional, timeless, professional',
    categories: ['pants', 'belts', 't-shirts', 'jackets'],
  },
  WAVE_RIDER: {
    key: 'WAVE_RIDER',
    name: 'WaveRider',
    style: 'Surf, beach, relaxed',
    categories: ['shorts', 'sandals', 't-shirts', 'hats'],
  },
  METRO_STYLE: {
    key: 'METRO_STYLE',
    name: 'MetroStyle',
    style: 'Urban, sophisticated, modern',
    categories: ['pants', 'jackets', 'bags', 'belts'],
  },
  ACTIVE_EDGE: {
    key: 'ACTIVE_EDGE',
    name: 'ActiveEdge',
    style: 'Athletic, sports, performance',
    categories: ['shorts', 'sneakers', 't-shirts', 'hoodies'],
  },
  VINTAGE_VAULT: {
    key: 'VINTAGE_VAULT',
    name: 'VintageVault',
    style: 'Retro, nostalgic, classic',
    categories: ['t-shirts', 'jackets', 'boots', 'hats'],
  },
  SUMMIT_GEAR: {
    key: 'SUMMIT_GEAR',
    name: 'SummitGear',
    style: 'Mountain, hiking, adventure',
    categories: ['boots', 'jackets', 'pants', 'bags'],
  },
  COASTAL_CRAFT: {
    key: 'COASTAL_CRAFT',
    name: 'CoastalCraft',
    style: 'Nautical, preppy, casual',
    categories: ['shorts', 'sandals', 'belts', 'bags'],
  },
  TERRA_FIRMA: {
    key: 'TERRA_FIRMA',
    name: 'TerraFirma',
    style: 'Workwear, rugged, utility',
    categories: ['boots', 'pants', 'jackets', 'belts'],
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
