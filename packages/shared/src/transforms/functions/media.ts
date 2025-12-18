/**
 * Media Transform Functions
 *
 * Functions for extracting and formatting product media (images, videos).
 */

import type { TransformFunction } from '../types';

/**
 * Extract additional images (skip first one)
 *
 * WooCommerce products have an images array.
 * The first image is used for image_link, remaining go to additional_image_link.
 *
 * @param images - Array of image objects from WooCommerce
 * @returns Array of image URLs (excluding first image)
 *
 * @example
 * // Input: [{ src: "img1.jpg" }, { src: "img2.jpg" }, { src: "img3.jpg" }]
 * // Output: ["img2.jpg", "img3.jpg"]
 */
export const extractAdditionalImages: TransformFunction = (images) => {
  if (!Array.isArray(images) || images.length <= 1) return [];
  return images.slice(1).map((img: any) => img.src).filter(Boolean);
};
