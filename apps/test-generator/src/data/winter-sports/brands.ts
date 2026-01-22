/**
 * Winter Sports Brand Definitions
 * Realistic ski and snowboard brands
 */

export interface WinterSportsBrand {
  name: string;
  categories: ('skis' | 'snowboards')[];
}

export const WINTER_SPORTS_BRANDS: WinterSportsBrand[] = [
  // Ski-focused brands
  { name: 'Rossignol', categories: ['skis', 'snowboards'] },
  { name: 'Salomon', categories: ['skis', 'snowboards'] },
  { name: 'Atomic', categories: ['skis'] },
  { name: 'Head', categories: ['skis', 'snowboards'] },
  { name: 'Volkl', categories: ['skis'] },
  { name: 'Fischer', categories: ['skis'] },
  { name: 'K2', categories: ['skis', 'snowboards'] },
  { name: 'Nordica', categories: ['skis'] },
  { name: 'Blizzard', categories: ['skis'] },
  { name: 'Dynastar', categories: ['skis'] },

  // Snowboard-focused brands
  { name: 'Burton', categories: ['snowboards'] },
  { name: 'Lib Tech', categories: ['snowboards'] },
  { name: 'GNU', categories: ['snowboards'] },
  { name: 'Jones', categories: ['snowboards'] },
  { name: 'Capita', categories: ['snowboards'] },
  { name: 'Never Summer', categories: ['snowboards'] },
  { name: 'Ride', categories: ['snowboards'] },
  { name: 'Rome', categories: ['snowboards'] },
];

/**
 * Get a brand for a specific category
 */
export function getWinterSportsBrand(
  category: 'skis' | 'snowboards',
  index: number
): WinterSportsBrand {
  const categoryBrands = WINTER_SPORTS_BRANDS.filter((b) =>
    b.categories.includes(category)
  );
  return categoryBrands[index % categoryBrands.length];
}

/**
 * Get all unique brand names for winter sports
 */
export function getWinterSportsBrandList(): { name: string }[] {
  return WINTER_SPORTS_BRANDS.map((b) => ({ name: b.name }));
}
