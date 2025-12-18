/**
 * Category Transform Functions
 *
 * Functions for building hierarchical category paths from WooCommerce data.
 */

import type { TransformFunction } from '../types';

/**
 * Build category path with > separator, respecting parent-child hierarchy
 *
 * WooCommerce categories have a `parent` field (ID of parent category).
 * We need to build the full path from root to leaf: "Parent > Child > Grandchild"
 *
 * Algorithm:
 * 1. Create a map of all categories by ID
 * 2. For each category, recursively build path from root
 * 3. Return the deepest (most specific) category path
 *
 * @param categories - Array of category objects from WooCommerce
 * @returns Category path string with > separator
 *
 * @example
 * // Input: [{ id: 1, name: "Clothing", parent: 0 }, { id: 2, name: "Shirts", parent: 1 }]
 * // Output: "Clothing > Shirts"
 */
export const buildCategoryPath: TransformFunction = (categories) => {
  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    return '';
  }

  // Create a map of category ID -> category object for quick lookup
  const categoryMap = new Map<number, any>();
  categories.forEach((cat: any) => {
    if (cat.id) categoryMap.set(cat.id, cat);
  });

  // Build full path for a category by traversing up to root
  const buildPath = (category: any): string[] => {
    const path: string[] = [];
    let current = category;

    // Traverse up the hierarchy (max 10 levels to prevent infinite loops)
    let depth = 0;
    while (current && depth < 10) {
      path.unshift(current.name); // Add to beginning of array

      // If has parent and parent exists in our map, continue up
      if (current.parent && current.parent > 0 && categoryMap.has(current.parent)) {
        current = categoryMap.get(current.parent);
      } else {
        break; // Reached root or parent not in product's categories
      }
      depth++;
    }

    return path;
  };

  // Build paths for all categories and find the deepest one
  const paths = categories
    .map((cat: any) => buildPath(cat))
    .filter((path: string[]) => path.length > 0);

  if (paths.length === 0) {
    return '';
  }

  // Return the longest path (most specific category)
  const deepestPath = paths.reduce((longest, current) =>
    current.length > longest.length ? current : longest
  );

  return deepestPath.join(' > ');
};
