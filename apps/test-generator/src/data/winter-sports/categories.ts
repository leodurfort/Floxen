/**
 * Winter Sports Category Definitions
 * Simple hierarchy: Sports > Winter Sports > Skis/Snowboards
 */

import { CategoryDefinition } from '../categories';

export const WINTER_SPORTS_CATEGORIES: CategoryDefinition[] = [
  // Top-level category
  { slug: 'sports', name: 'Sports', parent: null },

  // Winter sports subcategory
  { slug: 'winter-sports', name: 'Winter Sports', parent: 'sports' },

  // Product categories
  { slug: 'skis', name: 'Skis', parent: 'winter-sports' },
  { slug: 'snowboards', name: 'Snowboards', parent: 'winter-sports' },
];

/**
 * Get winter sports categories sorted by hierarchy (parents first)
 */
export function getWinterSportsCategoriesByHierarchy(): CategoryDefinition[] {
  const result: CategoryDefinition[] = [];
  const added = new Set<string>();

  const addCategory = (category: CategoryDefinition) => {
    if (added.has(category.slug)) return;

    if (category.parent) {
      const parent = WINTER_SPORTS_CATEGORIES.find((c) => c.slug === category.parent);
      if (parent && !added.has(parent.slug)) {
        addCategory(parent);
      }
    }

    result.push(category);
    added.add(category.slug);
  };

  WINTER_SPORTS_CATEGORIES.forEach(addCategory);
  return result;
}
