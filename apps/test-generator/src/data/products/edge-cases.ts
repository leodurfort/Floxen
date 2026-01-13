/**
 * Edge Case Overrides Module
 * Defines specific PRD-required edge cases to test data validation boundaries
 *
 * These overrides are applied to specific products during generation to ensure
 * coverage of text limits, price boundaries, SKU edge cases, inventory anomalies,
 * and category/image edge cases.
 */

import { ProductDefinition } from '@/types/product';

/**
 * Partial override type for product definitions
 */
export type EdgeCaseOverride = Partial<
  Pick<
    ProductDefinition,
    'name' | 'sku' | 'description' | 'shortDescription' | 'categories' | 'images'
  > & {
    regularPrice?: string;
    stockQuantity?: number;
    stockStatus?: 'instock' | 'outofstock' | 'onbackorder';
  }
>;

/**
 * Edge case registry - maps category:index to override values
 */
const EDGE_CASES: Record<string, EdgeCaseOverride> = {
  // ===== TEXT EDGE CASES (EC-TXT-*) =====

  // EC-TXT-01: Very long product name (150+ characters)
  't-shirts:7': {
    name: 'Premium Ultra-Soft Organic Cotton Long-Sleeve Vintage Wash Crew Neck T-Shirt with Reinforced Seams and Tagless Label for All-Day Comfort - Limited Edition Collection Series',
  },

  // EC-TXT-05: Empty product name (validation test)
  't-shirts:14': {
    name: '',
  },

  // EC-TXT-07: Very long description (5000+ characters)
  'hoodies:0': {
    description: generateLongDescription(),
  },

  // EC-TXT-09: Description with potential XSS content (should be escaped)
  'hoodies:1': {
    description:
      'Premium hoodie with <script>alert("XSS")</script> extra comfort. Features include <img src="x" onerror="alert(\'XSS\')"> quality stitching and <a href="javascript:alert(\'XSS\')">click here</a> for details. Style: <style>body{display:none}</style> modern fit. Notes: <iframe src="evil.com"></iframe> None. Made with <svg onload="alert(\'XSS\')"> care.',
  },

  // ===== PRICE EDGE CASES (EC-PRC-*) =====

  // EC-PRC-01: Zero price
  'pants:0': {
    regularPrice: '0.00',
  },

  // EC-PRC-02: Minimum price (1 cent)
  'pants:1': {
    regularPrice: '0.01',
  },

  // EC-PRC-03: Very high price
  'pants:2': {
    regularPrice: '999999.99',
  },

  // ===== SKU EDGE CASES (EC-SKU-*) =====

  // EC-SKU-02: Empty SKU (should be handled gracefully)
  'shorts:0': {
    sku: '',
  },

  // EC-SKU-03: Very long SKU (80+ characters)
  'shorts:1': {
    sku: 'SHORTS-EXTRA-LONG-SKU-CODE-WITH-MANY-CHARACTERS-FOR-TESTING-LIMITS-2024-EDITION-V2',
  },

  // ===== INVENTORY EDGE CASES (EC-INV-*) =====

  // EC-INV-02: Negative stock quantity
  'sneakers:0': {
    stockQuantity: -5,
  },

  // EC-INV-07: Zero stock but marked in-stock (inconsistent state)
  'sneakers:1': {
    stockQuantity: 0,
    stockStatus: 'instock',
  },

  // ===== CATEGORY EDGE CASES (EC-CAT-*) =====

  // EC-CAT-05: No categories assigned
  'boots:0': {
    categories: [],
  },

  // ===== IMAGE EDGE CASES (EC-IMG-*) =====

  // EC-IMG-04: No images
  'boots:1': {
    images: [],
  },
};

/**
 * Generate a 5000+ character description for EC-TXT-07
 */
function generateLongDescription(): string {
  const paragraphs = [
    'This premium hoodie represents the pinnacle of comfort and style, crafted with meticulous attention to detail using only the finest organic cotton sourced from sustainable farms. Every stitch has been carefully placed by skilled artisans who take pride in their craft, ensuring durability that will last through countless wears and washes.',

    'The unique blend of materials includes 80% organic cotton for breathability and softness, 15% recycled polyester for durability and moisture-wicking properties, and 5% elastane for the perfect amount of stretch that moves with your body throughout the day. This innovative fabric composition was developed over two years of research and testing.',

    'Our design team spent months perfecting the fit, consulting with fashion experts and gathering feedback from thousands of customers to create a silhouette that flatters all body types. The relaxed yet structured cut provides ample room for layering while maintaining a polished appearance suitable for both casual and semi-formal occasions.',

    'The hood features a double-layered construction with a brushed interior for extra warmth and comfort. Adjustable drawstrings made from recycled materials allow you to customize the fit around your face, providing protection from wind and light rain while adding a stylish detail to the overall design.',

    'Front kangaroo pocket offers ample space for your essentials while keeping your hands warm on chilly days. The pocket interior is lined with a soft fleece material that feels luxurious against your skin, making this hoodie the perfect companion for outdoor adventures or cozy nights at home.',

    'Reinforced seams at stress points ensure this hoodie can withstand the rigors of daily wear. Our quality control team inspects each garment individually, checking for any imperfections and ensuring that every customer receives a product that meets our exacting standards for excellence.',

    'The ribbed cuffs and hem provide a snug fit that keeps cold air out while maintaining their shape wash after wash. These details may seem small, but they contribute significantly to the overall comfort and longevity of the garment, demonstrating our commitment to quality in every aspect of production.',

    'Available in a range of carefully curated colors, each shade has been selected to complement a wide variety of skin tones and personal styles. Our dyes are certified eco-friendly and free from harmful chemicals, ensuring both environmental responsibility and safety for even the most sensitive skin.',

    'Machine washable for easy care, this hoodie maintains its softness and shape even after multiple laundry cycles. We recommend washing in cold water and tumble drying on low heat to maximize the lifespan of your garment while minimizing environmental impact.',

    'Whether you are heading to the gym, running errands, working from home, or meeting friends for coffee, this versatile hoodie adapts to any situation with effortless style. It has quickly become a customer favorite, earning rave reviews for its exceptional comfort, durability, and timeless design that never goes out of fashion.',
  ];

  // Repeat paragraphs to exceed 5000 characters
  return paragraphs.concat(paragraphs).join('\n\n');
}

/**
 * Get edge case override for a specific product
 * @param category - The product category slug
 * @param index - The product index within that category
 * @returns Override values or undefined if no edge case exists
 */
export function getEdgeCaseOverride(
  category: string,
  index: number
): EdgeCaseOverride | undefined {
  const key = `${category}:${index}`;
  return EDGE_CASES[key];
}

/**
 * Check if a product should have no images (EC-IMG-04)
 */
export function shouldHaveNoImages(category: string, index: number): boolean {
  const override = getEdgeCaseOverride(category, index);
  return override?.images !== undefined && override.images.length === 0;
}

/**
 * Get all defined edge case keys for testing/debugging
 */
export function getEdgeCaseKeys(): string[] {
  return Object.keys(EDGE_CASES);
}
