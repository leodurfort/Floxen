/**
 * Category definitions for the WooCommerce Test Data Generator
 * 14 categories organized in a hierarchy
 */

export interface CategoryDefinition {
  slug: string;
  name: string;
  parent: string | null;
}

export const CATEGORIES: CategoryDefinition[] = [
  // Top-level categories
  { slug: 'apparel', name: 'Apparel', parent: null },
  { slug: 'footwear', name: 'Footwear', parent: null },
  { slug: 'accessories', name: 'Accessories', parent: null },

  // Apparel subcategories
  { slug: 'tops', name: 'Tops', parent: 'apparel' },
  { slug: 't-shirts', name: 'T-Shirts', parent: 'tops' },
  { slug: 'hoodies', name: 'Hoodies', parent: 'tops' },
  { slug: 'jackets', name: 'Jackets', parent: 'tops' },
  { slug: 'bottoms', name: 'Bottoms', parent: 'apparel' },
  { slug: 'pants', name: 'Pants', parent: 'bottoms' },
  { slug: 'shorts', name: 'Shorts', parent: 'bottoms' },

  // Footwear subcategories
  { slug: 'sneakers', name: 'Sneakers', parent: 'footwear' },
  { slug: 'boots', name: 'Boots', parent: 'footwear' },
  { slug: 'sandals', name: 'Sandals', parent: 'footwear' },

  // Accessories subcategories
  { slug: 'hats', name: 'Hats', parent: 'accessories' },
  { slug: 'bags', name: 'Bags', parent: 'accessories' },
  { slug: 'belts', name: 'Belts', parent: 'accessories' },
];

/**
 * Get categories sorted by hierarchy level (parents first)
 */
export function getCategoriesByHierarchy(): CategoryDefinition[] {
  const result: CategoryDefinition[] = [];
  const added = new Set<string>();

  const addCategory = (category: CategoryDefinition) => {
    if (added.has(category.slug)) return;

    // Add parent first if exists
    if (category.parent) {
      const parent = CATEGORIES.find((c) => c.slug === category.parent);
      if (parent && !added.has(parent.slug)) {
        addCategory(parent);
      }
    }

    result.push(category);
    added.add(category.slug);
  };

  CATEGORIES.forEach(addCategory);
  return result;
}

/**
 * Get the depth of a category in the hierarchy
 */
export function getCategoryDepth(slug: string): number {
  const category = CATEGORIES.find((c) => c.slug === slug);
  if (!category) return 0;
  if (!category.parent) return 0;
  return 1 + getCategoryDepth(category.parent);
}
