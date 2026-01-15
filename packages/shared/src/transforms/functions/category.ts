/**
 * Category Transform Functions
 */

import type { TransformFunction } from '../types';

/**
 * Build category path with " > " separator, respecting parent-child hierarchy.
 * Returns the deepest (most specific) category path.
 */
export const buildCategoryPath: TransformFunction = (categories) => {
  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    return '';
  }

  const categoryMap = new Map<number, any>();
  categories.forEach((cat: any) => {
    if (cat.id) categoryMap.set(cat.id, cat);
  });

  const buildPath = (category: any): string[] => {
    const path: string[] = [];
    let current = category;
    let depth = 0;

    while (current && depth < 10) {
      path.unshift(current.name);
      if (current.parent && current.parent > 0 && categoryMap.has(current.parent)) {
        current = categoryMap.get(current.parent);
      } else {
        break;
      }
      depth++;
    }
    return path;
  };

  const paths = categories
    .map((cat: any) => buildPath(cat))
    .filter((path: string[]) => path.length > 0);

  if (paths.length === 0) return '';

  const deepestPath = paths.reduce((longest, current) =>
    current.length > longest.length ? current : longest
  );

  return deepestPath.join(' > ');
};
