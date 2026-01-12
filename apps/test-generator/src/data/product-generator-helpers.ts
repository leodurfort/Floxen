/**
 * Helper functions for generating product data
 */

import {
  SimpleProductDefinition,
  VariableProductDefinition,
  GroupedProductDefinition,
  VariationDefinition,
  ProductAttribute,
  StockStatus,
} from '@/types/product';
import { BRANDS, getBrandForCategory } from './brands';

// Common attributes
export const SIZES = {
  CLOTHING: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  PANTS_WAIST: ['28', '30', '32', '34', '36', '38', '40'],
  PANTS_LENGTH: ['30', '32', '34'],
  SHOES_US: ['6', '7', '8', '9', '10', '11', '12', '13'],
  SHOES_WIDTH: ['Narrow', 'Standard', 'Wide'],
  BELT: ['S (28-32)', 'M (32-36)', 'L (36-40)', 'XL (40-44)'],
  HAT: ['S/M', 'L/XL', 'One Size'],
};

export const COLORS = [
  'Black',
  'White',
  'Navy',
  'Gray',
  'Red',
  'Blue',
  'Green',
  'Brown',
  'Beige',
  'Olive',
  'Burgundy',
  'Charcoal',
];

// Price ranges by category
export const PRICE_RANGES: Record<string, { min: number; max: number }> = {
  't-shirts': { min: 19.99, max: 49.99 },
  hoodies: { min: 49.99, max: 89.99 },
  jackets: { min: 79.99, max: 199.99 },
  pants: { min: 39.99, max: 99.99 },
  shorts: { min: 29.99, max: 59.99 },
  sneakers: { min: 59.99, max: 149.99 },
  boots: { min: 89.99, max: 249.99 },
  sandals: { min: 29.99, max: 79.99 },
  hats: { min: 19.99, max: 49.99 },
  bags: { min: 39.99, max: 149.99 },
  belts: { min: 24.99, max: 79.99 },
};

// Helper to generate a random price within range
export function randomPrice(category: string): string {
  const range = PRICE_RANGES[category] || { min: 29.99, max: 99.99 };
  const price = range.min + Math.random() * (range.max - range.min);
  return price.toFixed(2);
}

// Helper to maybe generate a sale price (30% chance)
export function maybeSalePrice(regularPrice: string): string | undefined {
  if (Math.random() > 0.3) return undefined;
  const discount = 0.1 + Math.random() * 0.3; // 10-40% off
  return (parseFloat(regularPrice) * (1 - discount)).toFixed(2);
}

// Helper to generate stock status
export function randomStockStatus(): { quantity: number; status: StockStatus } {
  const rand = Math.random();
  if (rand < 0.1) {
    return { quantity: 0, status: 'outofstock' };
  } else if (rand < 0.2) {
    return { quantity: Math.floor(Math.random() * 5) + 1, status: 'onbackorder' };
  }
  return { quantity: Math.floor(Math.random() * 100) + 10, status: 'instock' };
}

// Product name generators by category
const PRODUCT_NAMES: Record<string, string[]> = {
  't-shirts': [
    'Classic Crew Tee',
    'V-Neck Essential',
    'Graphic Print Tee',
    'Pocket Tee',
    'Long Sleeve Basic',
    'Henley Shirt',
    'Raglan Tee',
    'Oversized Fit Tee',
    'Striped Crew',
    'Premium Cotton Tee',
  ],
  hoodies: [
    'Pullover Hoodie',
    'Zip-Up Hoodie',
    'Fleece Hoodie',
    'Heavyweight Hoodie',
    'Cropped Hoodie',
    'Tech Fleece Hoodie',
    'Vintage Wash Hoodie',
    'Kangaroo Pocket Hoodie',
  ],
  jackets: [
    'Bomber Jacket',
    'Denim Jacket',
    'Windbreaker',
    'Rain Jacket',
    'Puffer Jacket',
    'Field Jacket',
    'Track Jacket',
    'Quilted Jacket',
    'Leather Jacket',
    'Coach Jacket',
  ],
  pants: [
    'Slim Fit Chinos',
    'Cargo Pants',
    'Jogger Pants',
    'Straight Leg Jeans',
    'Dress Pants',
    'Utility Pants',
    'Relaxed Fit Pants',
    'Tapered Pants',
    'Work Pants',
  ],
  shorts: [
    'Chino Shorts',
    'Athletic Shorts',
    'Cargo Shorts',
    'Board Shorts',
    'Running Shorts',
    'Sweat Shorts',
    'Denim Shorts',
    'Bermuda Shorts',
  ],
  sneakers: [
    'Low-Top Sneakers',
    'High-Top Sneakers',
    'Running Shoes',
    'Slip-On Sneakers',
    'Canvas Sneakers',
    'Retro Runners',
    'Training Shoes',
    'Casual Sneakers',
    'Skate Shoes',
  ],
  boots: [
    'Chelsea Boots',
    'Work Boots',
    'Hiking Boots',
    'Combat Boots',
    'Chukka Boots',
    'Winter Boots',
    'Ankle Boots',
    'Desert Boots',
  ],
  sandals: [
    'Slide Sandals',
    'Flip Flops',
    'Sport Sandals',
    'Leather Sandals',
    'Platform Sandals',
    'Fisherman Sandals',
    'Thong Sandals',
    'Beach Sandals',
  ],
  hats: [
    'Baseball Cap',
    'Beanie',
    'Bucket Hat',
    'Trucker Hat',
    'Snapback',
    'Dad Hat',
    'Visor',
    'Fedora',
    'Wide Brim Hat',
  ],
  bags: [
    'Backpack',
    'Tote Bag',
    'Messenger Bag',
    'Duffel Bag',
    'Crossbody Bag',
    'Laptop Bag',
    'Weekender Bag',
    'Sling Bag',
    'Travel Bag',
  ],
  belts: [
    'Leather Belt',
    'Canvas Belt',
    'Braided Belt',
    'Reversible Belt',
    'Dress Belt',
    'Casual Belt',
    'Web Belt',
    'Work Belt',
  ],
};

// Get a product name
export function getProductName(category: string, index: number): string {
  const names = PRODUCT_NAMES[category] || ['Product'];
  return names[index % names.length];
}

// Generate SKU
export function generateSKU(
  category: string,
  brand: string,
  index: number,
  suffix?: string
): string {
  const catCode = category.substring(0, 3).toUpperCase();
  const brandCode = brand.substring(0, 2).toUpperCase();
  const numPart = String(index).padStart(3, '0');
  return suffix
    ? `${catCode}-${brandCode}-${numPart}-${suffix}`
    : `${catCode}-${brandCode}-${numPart}`;
}

// Generate description
export function generateDescription(
  name: string,
  brand: string,
  category: string
): string {
  return `The ${name} from ${brand} is a premium ${category.replace('-', ' ')} designed for comfort and style. Made with high-quality materials and attention to detail, this piece is perfect for any occasion.`;
}

// Generate short description
export function generateShortDescription(name: string, brand: string): string {
  return `${brand} ${name} - Quality meets style.`;
}

/**
 * Create a simple product definition
 */
export function createSimpleProduct(
  category: string,
  index: number,
  overrides?: Partial<SimpleProductDefinition>
): SimpleProductDefinition {
  const brand = getBrandForCategory(category);
  const name = getProductName(category, index);
  const regularPrice = randomPrice(category);
  const stock = randomStockStatus();

  return {
    type: 'simple',
    sku: generateSKU(category, brand.name, index),
    name: `${brand.name} ${name}`,
    description: generateDescription(name, brand.name, category),
    shortDescription: generateShortDescription(name, brand.name),
    categories: [category],
    brand: brand.name,
    regularPrice,
    salePrice: maybeSalePrice(regularPrice),
    stockQuantity: stock.quantity,
    stockStatus: stock.status,
    manageStock: true,
    ...overrides,
  };
}

/**
 * Create a variable product definition
 */
export function createVariableProduct(
  category: string,
  index: number,
  attributes: ProductAttribute[],
  createVariations: (baseSku: string, attrs: ProductAttribute[]) => VariationDefinition[],
  overrides?: Partial<VariableProductDefinition>
): VariableProductDefinition {
  const brand = getBrandForCategory(category);
  const name = getProductName(category, index);
  const baseSku = generateSKU(category, brand.name, index);

  return {
    type: 'variable',
    sku: baseSku,
    name: `${brand.name} ${name}`,
    description: generateDescription(name, brand.name, category),
    shortDescription: generateShortDescription(name, brand.name),
    categories: [category],
    brand: brand.name,
    attributes,
    variations: createVariations(baseSku, attributes),
    ...overrides,
  };
}

/**
 * Create a grouped product definition
 */
export function createGroupedProduct(
  category: string,
  index: number,
  childSkus: string[],
  overrides?: Partial<GroupedProductDefinition>
): GroupedProductDefinition {
  const brand = getBrandForCategory(category);
  const name = `${getProductName(category, index)} Bundle`;

  return {
    type: 'grouped',
    sku: generateSKU(category, brand.name, index, 'GRP'),
    name: `${brand.name} ${name}`,
    description: `Get the complete ${name} from ${brand.name}. This bundle includes multiple items at a great value.`,
    shortDescription: `${brand.name} ${name} - Complete set.`,
    categories: [category],
    brand: brand.name,
    groupedProductSkus: childSkus,
    ...overrides,
  };
}

/**
 * Generate clothing variations (size + color)
 */
export function createClothingVariations(
  baseSku: string,
  attrs: ProductAttribute[],
  basePrice: string
): VariationDefinition[] {
  const variations: VariationDefinition[] = [];
  const sizes = attrs.find((a) => a.name === 'Size')?.options || SIZES.CLOTHING;
  const colors = attrs.find((a) => a.name === 'Color')?.options || COLORS.slice(0, 4);

  sizes.forEach((size) => {
    colors.forEach((color) => {
      const stock = randomStockStatus();
      const price = basePrice;
      variations.push({
        sku: `${baseSku}-${size}-${color.substring(0, 3).toUpperCase()}`,
        regularPrice: price,
        salePrice: maybeSalePrice(price),
        stockQuantity: stock.quantity,
        stockStatus: stock.status,
        attributes: { Size: size, Color: color },
      });
    });
  });

  return variations;
}

/**
 * Generate shoe variations (size + width)
 */
export function createShoeVariations(
  baseSku: string,
  attrs: ProductAttribute[],
  basePrice: string
): VariationDefinition[] {
  const variations: VariationDefinition[] = [];
  const sizes = attrs.find((a) => a.name === 'Size')?.options || SIZES.SHOES_US;
  const colors = attrs.find((a) => a.name === 'Color')?.options || COLORS.slice(0, 3);

  sizes.forEach((size) => {
    colors.forEach((color) => {
      const stock = randomStockStatus();
      variations.push({
        sku: `${baseSku}-${size}-${color.substring(0, 3).toUpperCase()}`,
        regularPrice: basePrice,
        salePrice: maybeSalePrice(basePrice),
        stockQuantity: stock.quantity,
        stockStatus: stock.status,
        attributes: { Size: size, Color: color },
      });
    });
  });

  return variations;
}
