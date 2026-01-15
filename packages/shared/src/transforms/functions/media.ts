/**
 * Media Transform Functions
 */

import type { TransformFunction } from '../types';

/**
 * Extract additional images (skip first, which is used for image_link)
 */
export const extractAdditionalImages: TransformFunction = (images) => {
  if (!Array.isArray(images) || images.length <= 1) return [];
  return images.slice(1).map((img: any) => img.src).filter(Boolean);
};
