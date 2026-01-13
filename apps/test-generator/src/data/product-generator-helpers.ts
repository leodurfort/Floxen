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
  BrandStorageMethod,
  GtinStorageMethod,
  GtinType,
  Gender,
  AgeGroup,
  SizeSystem,
  SaleDateRange,
} from '@/types/product';
import { BRANDS, getBrandForCategory } from './brands';

/**
 * Brand storage method distribution for test coverage:
 * - 40% taxonomy (pa_brand) - EC-BRD-01
 * - 30% attribute (visible Brand attribute) - EC-BRD-02
 * - 20% meta (_brand meta_data) - EC-BRD-03
 * - 10% none (no brand) - EC-BRD-04
 */
const BRAND_STORAGE_DISTRIBUTION: BrandStorageMethod[] = [
  'taxonomy', 'taxonomy', 'taxonomy', 'taxonomy', // 40%
  'attribute', 'attribute', 'attribute',           // 30%
  'meta', 'meta',                                  // 20%
  'none',                                          // 10%
];

/**
 * Get brand storage method based on product index for deterministic distribution
 */
export function getBrandStorageMethod(index: number): BrandStorageMethod {
  return BRAND_STORAGE_DISTRIBUTION[index % BRAND_STORAGE_DISTRIBUTION.length];
}

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
 * Create a simple product definition with all PRD-required fields
 * Note: brandStorageMethod is assigned by getBrandStorageMethod using index,
 * but gets reassigned in products/index.ts for proper global distribution
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
  const optionalFields = generateOptionalFields(category, brand.name, index);

  return {
    type: 'simple',
    sku: generateSKU(category, brand.name, index),
    name: `${brand.name} ${name}`,
    description: generateDescription(name, brand.name, category),
    shortDescription: generateShortDescription(name, brand.name),
    categories: [category],
    brand: brand.name,
    brandStorageMethod: getBrandStorageMethod(index), // Placeholder, reassigned in index.ts
    regularPrice,
    salePrice: maybeSalePrice(regularPrice),
    stockQuantity: stock.quantity,
    stockStatus: stock.status,
    manageStock: true,
    // PRD-required optional fields
    ...optionalFields,
    ...overrides,
  };
}

/**
 * Create a variable product definition with all PRD-required fields
 * Note: brandStorageMethod is assigned by getBrandStorageMethod using index,
 * but gets reassigned in products/index.ts for proper global distribution
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
  const optionalFields = generateOptionalFields(category, brand.name, index);

  return {
    type: 'variable',
    sku: baseSku,
    name: `${brand.name} ${name}`,
    description: generateDescription(name, brand.name, category),
    shortDescription: generateShortDescription(name, brand.name),
    categories: [category],
    brand: brand.name,
    brandStorageMethod: getBrandStorageMethod(index), // Placeholder, reassigned in index.ts
    attributes,
    variations: createVariations(baseSku, attributes),
    // PRD-required optional fields
    ...optionalFields,
    ...overrides,
  };
}

/**
 * Create a grouped product definition with all PRD-required fields
 * Note: brandStorageMethod is assigned by getBrandStorageMethod using index,
 * but gets reassigned in products/index.ts for proper global distribution
 */
export function createGroupedProduct(
  category: string,
  index: number,
  childSkus: string[],
  overrides?: Partial<GroupedProductDefinition>
): GroupedProductDefinition {
  const brand = getBrandForCategory(category);
  const name = `${getProductName(category, index)} Bundle`;
  const optionalFields = generateOptionalFields(category, brand.name, index);

  return {
    type: 'grouped',
    sku: generateSKU(category, brand.name, index, 'GRP'),
    name: `${brand.name} ${name}`,
    description: `Get the complete ${name} from ${brand.name}. This bundle includes multiple items at a great value.`,
    shortDescription: `${brand.name} ${name} - Complete set.`,
    categories: [category],
    brand: brand.name,
    brandStorageMethod: getBrandStorageMethod(index), // Placeholder, reassigned in index.ts
    groupedProductSkus: childSkus,
    // PRD-required optional fields
    ...optionalFields,
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

// ============================================================================
// WEIGHT GENERATORS (EC-DIM-06 to EC-DIM-09) - 80% coverage
// ============================================================================

/**
 * Weight ranges by category in kg
 */
export const WEIGHT_RANGES: Record<string, { min: number; max: number }> = {
  't-shirts': { min: 0.15, max: 0.3 },
  hoodies: { min: 0.4, max: 0.8 },
  jackets: { min: 0.5, max: 1.5 },
  pants: { min: 0.3, max: 0.6 },
  shorts: { min: 0.2, max: 0.35 },
  sneakers: { min: 0.6, max: 1.0 },
  boots: { min: 0.9, max: 1.8 },
  sandals: { min: 0.2, max: 0.5 },
  hats: { min: 0.05, max: 0.15 },
  bags: { min: 0.3, max: 1.2 },
  belts: { min: 0.1, max: 0.25 },
};

/**
 * Generate weight for a product (80% have weight per PRD)
 * @param category Product category
 * @param index Product index (used for distribution)
 * @returns Weight in kg as string, or undefined
 */
export function maybeGenerateWeight(category: string, index: number): string | undefined {
  // 80% have weight (indices 0-7 out of each 10)
  if (index % 10 >= 8) return undefined;

  const range = WEIGHT_RANGES[category] || { min: 0.3, max: 0.8 };
  const weight = range.min + Math.random() * (range.max - range.min);
  return weight.toFixed(2);
}

/**
 * Generate specific weight edge case
 */
export function generateWeightEdgeCase(
  edgeCase: 'zero' | 'large' | 'decimal' | 'heavy' | 'light'
): string {
  switch (edgeCase) {
    case 'zero':
      return '0';
    case 'large':
      return '100'; // EC-DIM-08
    case 'decimal':
      return '0.125'; // EC-DIM-09
    case 'heavy':
      return '50';
    case 'light':
      return '0.01';
    default:
      return '0.5';
  }
}

// ============================================================================
// DIMENSION GENERATORS (EC-DIM-01 to EC-DIM-05) - 60% coverage
// ============================================================================

/**
 * Dimension ranges by category in cm (L x W x H)
 */
export const DIMENSION_RANGES: Record<
  string,
  { length: [number, number]; width: [number, number]; height: [number, number] }
> = {
  't-shirts': { length: [60, 75], width: [45, 55], height: [1, 3] },
  hoodies: { length: [65, 80], width: [50, 60], height: [3, 6] },
  jackets: { length: [70, 90], width: [55, 70], height: [3, 8] },
  pants: { length: [90, 110], width: [35, 45], height: [2, 4] },
  shorts: { length: [40, 55], width: [35, 45], height: [1, 3] },
  sneakers: { length: [28, 35], width: [10, 14], height: [10, 15] },
  boots: { length: [30, 40], width: [12, 16], height: [20, 35] },
  sandals: { length: [25, 32], width: [10, 14], height: [2, 5] },
  hats: { length: [20, 30], width: [18, 28], height: [10, 18] },
  bags: { length: [30, 55], width: [15, 40], height: [10, 45] },
  belts: { length: [90, 130], width: [3, 5], height: [0.3, 0.8] },
};

/**
 * Generate dimensions for a product (60% have dimensions per PRD)
 * @param category Product category
 * @param index Product index (used for distribution)
 * @returns Dimensions object or undefined
 */
export function maybeGenerateDimensions(
  category: string,
  index: number
): { length: string; width: string; height: string } | undefined {
  // 60% have dimensions (indices 0-5 out of each 10)
  if (index % 10 >= 6) return undefined;

  const ranges = DIMENSION_RANGES[category] || {
    length: [20, 40],
    width: [15, 30],
    height: [5, 15],
  };

  return {
    length: (ranges.length[0] + Math.random() * (ranges.length[1] - ranges.length[0])).toFixed(1),
    width: (ranges.width[0] + Math.random() * (ranges.width[1] - ranges.width[0])).toFixed(1),
    height: (ranges.height[0] + Math.random() * (ranges.height[1] - ranges.height[0])).toFixed(1),
  };
}

/**
 * Generate dimension edge cases
 */
export function generateDimensionEdgeCase(
  edgeCase: 'partial' | 'zero' | 'large' | 'decimal'
): { length: string; width: string; height: string } | { length: string; width: string } {
  switch (edgeCase) {
    case 'partial': // EC-DIM-02
      return { length: '10', width: '5' } as { length: string; width: string };
    case 'zero': // EC-DIM-03
      return { length: '0', width: '0', height: '0' };
    case 'large': // EC-DIM-04
      return { length: '1000', width: '500', height: '200' };
    case 'decimal': // EC-DIM-05
      return { length: '10.5', width: '5.25', height: '2.75' };
    default:
      return { length: '10', width: '5', height: '2' };
  }
}

// ============================================================================
// GTIN GENERATORS (EC-GTIN-01 to EC-GTIN-09) - 30% coverage
// ============================================================================

/**
 * GTIN storage method distribution:
 * - 50% _gtin (EC-GTIN-05)
 * - 30% gtin (EC-GTIN-06)
 * - 20% global_unique_id (native WooCommerce)
 */
const GTIN_STORAGE_DISTRIBUTION: GtinStorageMethod[] = [
  '_gtin', '_gtin', '_gtin', '_gtin', '_gtin', // 50%
  'gtin', 'gtin', 'gtin',                       // 30%
  'global_unique_id', 'global_unique_id',       // 20%
];

/**
 * Calculate GTIN check digit using Luhn algorithm for GTINs
 */
function calculateGtinCheckDigit(digits: string): string {
  let sum = 0;
  const len = digits.length;
  for (let i = 0; i < len; i++) {
    const digit = parseInt(digits[i], 10);
    // For GTIN, odd positions (from right, 1-indexed) multiply by 3
    sum += (len - i) % 2 === 1 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit.toString();
}

/**
 * Generate a valid UPC-A (12 digits) - EC-GTIN-01
 */
export function generateUPCA(seed: number): string {
  const prefix = '012345'; // UPC company prefix
  const item = String(seed).padStart(5, '0').slice(-5);
  const base = prefix + item;
  return base + calculateGtinCheckDigit(base);
}

/**
 * Generate a valid EAN-13 (13 digits) - EC-GTIN-02
 */
export function generateEAN13(seed: number): string {
  const prefix = '400638'; // Example GS1 prefix
  const item = String(seed).padStart(6, '0').slice(-6);
  const base = prefix + item;
  return base + calculateGtinCheckDigit(base);
}

/**
 * Generate a valid GTIN-14 (14 digits) - EC-GTIN-03
 */
export function generateGTIN14(seed: number): string {
  const indicator = '0'; // Packaging indicator
  const prefix = '0614141'; // GS1 company prefix
  const item = String(seed).padStart(5, '0').slice(-5);
  const base = indicator + prefix + item;
  return base + calculateGtinCheckDigit(base);
}

/**
 * Generate a valid ISBN-13 - EC-GTIN-04
 */
export function generateISBN13(seed: number): string {
  const prefix = '978316'; // ISBN prefix + publisher
  const item = String(seed).padStart(6, '0').slice(-6);
  const base = prefix + item;
  return base + calculateGtinCheckDigit(base);
}

/**
 * Generate GTIN for a product (30% have GTIN per PRD)
 */
export function maybeGenerateGtin(
  index: number
): { gtin: string; gtinType: GtinType; gtinStorageMethod: GtinStorageMethod } | undefined {
  // 30% have GTIN (indices 0-2 out of each 10)
  if (index % 10 >= 3) return undefined;

  const gtinTypeIndex = index % 4;
  let gtin: string;
  let gtinType: GtinType;

  switch (gtinTypeIndex) {
    case 0:
      gtin = generateUPCA(index);
      gtinType = 'UPC-A';
      break;
    case 1:
      gtin = generateEAN13(index);
      gtinType = 'EAN-13';
      break;
    case 2:
      gtin = generateGTIN14(index);
      gtinType = 'GTIN-14';
      break;
    case 3:
      gtin = generateISBN13(index);
      gtinType = 'ISBN-13';
      break;
    default:
      gtin = generateUPCA(index);
      gtinType = 'UPC-A';
  }

  const gtinStorageMethod = GTIN_STORAGE_DISTRIBUTION[index % GTIN_STORAGE_DISTRIBUTION.length];

  return { gtin, gtinType, gtinStorageMethod };
}

/**
 * Generate GTIN edge cases
 */
export function generateGtinEdgeCase(
  edgeCase: 'empty' | 'invalid' | 'formatted'
): string {
  switch (edgeCase) {
    case 'empty': // EC-GTIN-07
      return '';
    case 'invalid': // EC-GTIN-08
      return '12345'; // Wrong length
    case 'formatted': // EC-GTIN-09
      return '012-345-678-905';
    default:
      return '';
  }
}

// ============================================================================
// MPN GENERATOR - 20% coverage
// ============================================================================

/**
 * Generate MPN (Manufacturer Part Number) - 20% coverage
 */
export function maybeGenerateMpn(
  category: string,
  brand: string,
  index: number
): string | undefined {
  // 20% have MPN (indices 0-1 out of each 10)
  if (index % 10 >= 2) return undefined;

  const catCode = category.substring(0, 3).toUpperCase();
  const brandCode = brand.substring(0, 3).toUpperCase();
  const year = 2024 + (index % 3);
  const num = String(index * 1000 + 100).padStart(6, '0');

  return `${brandCode}-${catCode}-${year}-${num}`;
}

// ============================================================================
// MATERIAL DEFINITIONS - 70% coverage
// ============================================================================

export const MATERIALS_BY_CATEGORY: Record<string, string[]> = {
  't-shirts': ['100% Cotton', '60% Cotton 40% Polyester', 'Organic Cotton', 'Bamboo Blend', 'Recycled Polyester'],
  hoodies: ['80% Cotton 20% Polyester', 'French Terry', 'Fleece', 'Organic Cotton Blend'],
  jackets: ['100% Nylon', 'Leather', 'Denim', 'Polyester Shell', 'Gore-Tex', 'Down Fill'],
  pants: ['98% Cotton 2% Elastane', 'Denim', 'Chino Twill', 'Fleece', 'Technical Stretch'],
  shorts: ['100% Cotton', 'Nylon Blend', 'Quick-Dry Polyester', 'Recycled Materials'],
  sneakers: ['Canvas', 'Leather', 'Synthetic Mesh', 'Knit Upper', 'Suede'],
  boots: ['Full Grain Leather', 'Nubuck', 'Synthetic', 'Waterproof Membrane', 'Rubber'],
  sandals: ['EVA Foam', 'Leather', 'Rubber', 'Cork Footbed', 'Recycled Materials'],
  hats: ['100% Cotton', 'Wool Blend', 'Polyester', 'Straw', 'Acrylic'],
  bags: ['Nylon', 'Canvas', 'Leather', 'Recycled Polyester', 'Cordura'],
  belts: ['Genuine Leather', 'Full Grain Leather', 'Canvas', 'Bonded Leather', 'Webbing'],
};

/**
 * Generate material for a product (70% have material per PRD)
 */
export function maybeGenerateMaterial(category: string, index: number): string | undefined {
  // 70% have material (indices 0-6 out of each 10)
  if (index % 10 >= 7) return undefined;

  const materials = MATERIALS_BY_CATEGORY[category] || ['Mixed Materials'];
  return materials[index % materials.length];
}

// ============================================================================
// GENDER DISTRIBUTION - 60% coverage
// ============================================================================

const GENDER_DISTRIBUTION: (Gender | undefined)[] = [
  'male', 'female', 'unisex', 'male', 'female', 'unisex', // 60%
  undefined, undefined, undefined, undefined,              // 40% no gender
];

/**
 * Generate gender for a product (60% have gender per PRD)
 */
export function maybeGenerateGender(index: number): Gender | undefined {
  return GENDER_DISTRIBUTION[index % GENDER_DISTRIBUTION.length];
}

// ============================================================================
// AGE GROUP DISTRIBUTION - 40% coverage
// ============================================================================

const AGE_GROUP_DISTRIBUTION: (AgeGroup | undefined)[] = [
  'adult', 'adult', 'kids', 'adult',                      // 40%
  undefined, undefined, undefined, undefined, undefined, undefined, // 60% no age group
];

/**
 * Generate age group for a product (40% have age group per PRD)
 */
export function maybeGenerateAgeGroup(index: number): AgeGroup | undefined {
  return AGE_GROUP_DISTRIBUTION[index % AGE_GROUP_DISTRIBUTION.length];
}

// ============================================================================
// SIZE SYSTEM - 20% coverage (mainly for footwear)
// ============================================================================

const SIZE_SYSTEM_DISTRIBUTION: (SizeSystem | undefined)[] = [
  'US', 'EU',                                             // 20%
  undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, // 80%
];

/**
 * Generate size system for footwear (20% coverage)
 */
export function maybeGenerateSizeSystem(category: string, index: number): SizeSystem | undefined {
  // Only for footwear categories
  if (!['sneakers', 'boots', 'sandals'].includes(category)) return undefined;
  return SIZE_SYSTEM_DISTRIBUTION[index % SIZE_SYSTEM_DISTRIBUTION.length];
}

// ============================================================================
// SALE DATES (EC-PRC-08 to EC-PRC-10) - 20% coverage
// ============================================================================

/**
 * Generate sale date range (20% of products with sale prices have dates)
 */
export function maybeGenerateSaleDates(index: number): SaleDateRange | undefined {
  // 20% have sale dates (indices 0-1 out of each 10)
  if (index % 10 >= 2) return undefined;

  const now = new Date();
  const scenario = index % 3;

  switch (scenario) {
    case 0: // EC-PRC-08: Current sale
      return {
        from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        to: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      };
    case 1: // EC-PRC-09: Past sale
      return {
        from: '2025-01-01',
        to: '2025-06-30',
      };
    case 2: // EC-PRC-10: Future sale
      return {
        from: '2027-01-01',
        to: '2027-12-31',
      };
    default:
      return undefined;
  }
}

// ============================================================================
// OPTIONAL FIELDS FOR COMPREHENSIVE COVERAGE
// ============================================================================

/**
 * Maybe generate video link (4% coverage)
 */
export function maybeGenerateVideoLink(index: number): string | undefined {
  if (index % 25 !== 0) return undefined;
  return `https://www.youtube.com/watch?v=example${index}`;
}

/**
 * Maybe generate 3D model link (1% coverage)
 */
export function maybeGenerateModel3dLink(index: number): string | undefined {
  if (index % 100 !== 0) return undefined;
  return `https://sketchfab.com/models/example${index}`;
}

/**
 * Maybe generate delivery estimate (16% coverage)
 */
export function maybeGenerateDeliveryEstimate(index: number): string | undefined {
  if (index % 10 >= 2 || index % 6 !== 0) return undefined;
  const estimates = ['1-2 business days', '3-5 business days', '5-7 business days', '1-2 weeks'];
  return estimates[index % estimates.length];
}

/**
 * Maybe generate warning (3% coverage)
 */
export function maybeGenerateWarning(index: number): { warning: string; warningUrl: string } | undefined {
  if (index % 33 !== 0) return undefined;
  return {
    warning: 'This product contains materials that may cause allergic reactions in some individuals.',
    warningUrl: 'https://example.com/safety-info',
  };
}

/**
 * Maybe generate age restriction (2% coverage)
 */
export function maybeGenerateAgeRestriction(index: number): number | undefined {
  if (index % 50 !== 0) return undefined;
  return 18;
}

// ============================================================================
// PRD SECTION 9.1 - ADDITIONAL REQUIRED FIELDS
// ============================================================================

/**
 * Maybe generate unit pricing measure (10% coverage)
 * PRD Field #26
 */
export function maybeGenerateUnitPricingMeasure(index: number): string | undefined {
  if (index % 10 !== 0) return undefined;
  const measures = ['100ml', '250g', '500ml', '1kg', '100g', '50ml'];
  return measures[index % measures.length];
}

/**
 * Maybe generate unit pricing base measure (10% coverage)
 * PRD Field #27 - Only set if unitPricingMeasure is set
 */
export function maybeGenerateUnitPricingBaseMeasure(
  unitMeasure?: string
): string | undefined {
  if (!unitMeasure) return undefined;
  if (unitMeasure.includes('ml')) return '1L';
  if (unitMeasure.includes('g')) return '1kg';
  return undefined;
}

/**
 * Maybe generate pricing trend (6% coverage)
 * PRD Field #28
 */
export function maybeGeneratePricingTrend(
  index: number
): 'up' | 'down' | 'stable' | undefined {
  // ~6% = approximately 30 products out of 500
  if (index % 17 !== 0) return undefined;
  const trends: ('up' | 'down' | 'stable')[] = ['up', 'down', 'stable'];
  return trends[index % trends.length];
}

/**
 * Maybe generate availability date (16% coverage)
 * PRD Field #30 - For products on backorder or coming soon
 */
export function maybeGenerateAvailabilityDate(
  index: number,
  stockStatus?: string
): string | undefined {
  // ~16% of products, or if on backorder
  if (stockStatus !== 'onbackorder' && index % 6 !== 0) return undefined;
  const daysFromNow = 7 + (index % 30);
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

/**
 * Maybe generate expiration date (2% coverage)
 * PRD Field #32
 */
export function maybeGenerateExpirationDate(index: number): string | undefined {
  // ~2% = approximately 10 products out of 500
  if (index % 50 !== 0) return undefined;
  const daysFromNow = 90 + (index % 365);
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

/**
 * Maybe generate pickup method (5% coverage)
 * PRD Field #33
 */
export function maybeGeneratePickupMethod(
  index: number
): 'in_store' | 'curbside' | 'ship_to_store' | undefined {
  // ~5% = approximately 25 products out of 500
  if (index % 20 !== 0) return undefined;
  const methods: ('in_store' | 'curbside' | 'ship_to_store')[] = [
    'in_store',
    'curbside',
    'ship_to_store',
  ];
  return methods[index % methods.length];
}

/**
 * Maybe generate pickup SLA (5% coverage)
 * PRD Field #34 - Only set if pickupMethod is set
 */
export function maybeGeneratePickupSla(
  index: number,
  pickupMethod?: string
): string | undefined {
  if (!pickupMethod) return undefined;
  const slas = ['2 hours', 'same day', 'next business day', '1-2 hours'];
  return slas[index % slas.length];
}

/**
 * Maybe generate shipping info (20% coverage)
 * PRD Field #48
 */
export function maybeGenerateShippingInfo(
  index: number
): { country: string; price: string; service?: string } | undefined {
  // ~20% = every 5th product
  if (index % 5 !== 0) return undefined;
  const shippingOptions = [
    { country: 'US', price: '4.99', service: 'Standard' },
    { country: 'US', price: '9.99', service: 'Express' },
    { country: 'US', price: '0.00', service: 'Free Shipping' },
    { country: 'CA', price: '7.99', service: 'Standard' },
    { country: 'UK', price: '5.99', service: 'Standard' },
  ];
  return shippingOptions[index % shippingOptions.length];
}

/**
 * Maybe generate popularity score (30% coverage)
 * PRD Field #56
 */
export function maybeGeneratePopularityScore(index: number): number | undefined {
  // ~30% = indices 0-2 out of each 10
  if (index % 10 >= 3) return undefined;
  // Score 0-100, deterministic based on index
  return (index * 7 + 23) % 101;
}

/**
 * Maybe generate return rate (10% coverage)
 * PRD Field #57
 */
export function maybeGenerateReturnRate(index: number): number | undefined {
  // ~10% = every 10th product
  if (index % 10 !== 0) return undefined;
  // Return rate 0-15% as percentage, deterministic based on index
  return parseFloat(((index * 3) % 15).toFixed(1));
}

/**
 * Maybe generate Q&A (10% coverage)
 * PRD Field #65
 */
export function maybeGenerateQAndA(
  index: number
): Array<{ question: string; answer: string }> | undefined {
  if (index % 10 !== 0) return undefined;

  const qaTemplates = [
    {
      question: 'What material is this made of?',
      answer: 'High-quality cotton blend for maximum comfort and durability.',
    },
    {
      question: 'Is this true to size?',
      answer: 'Yes, we recommend ordering your usual size for the perfect fit.',
    },
    {
      question: 'How do I wash this item?',
      answer: 'Machine wash cold with like colors. Tumble dry low.',
    },
    {
      question: 'Is this product suitable for all seasons?',
      answer: 'Yes, the breathable fabric makes it comfortable year-round.',
    },
  ];

  const numQA = 1 + (index % 4);
  return qaTemplates.slice(0, numQA);
}

/**
 * Maybe generate raw review data (6% coverage)
 * PRD Field #66
 */
export function maybeGenerateRawReviewData(
  index: number
): Array<{ reviewer: string; rating: number; text: string; date: string }> | undefined {
  // ~6% = approximately 30 products
  if (index % 17 !== 0) return undefined;

  const reviewers = ['John D.', 'Sarah M.', 'Mike T.', 'Emily R.', 'Chris P.'];
  const reviewTexts = [
    'Great product! Exceeded my expectations.',
    'Good quality for the price. Would recommend.',
    'Fits perfectly and looks great.',
    'Fast shipping and excellent quality.',
    'Love it! Will buy again.',
  ];

  const reviews: Array<{ reviewer: string; rating: number; text: string; date: string }> = [];
  const numReviews = 1 + (index % 5);

  for (let i = 0; i < numReviews; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (i * 10 + (index % 30)));
    reviews.push({
      reviewer: reviewers[i % reviewers.length],
      rating: 3 + (i % 3), // Ratings 3-5
      text: reviewTexts[i % reviewTexts.length],
      date: date.toISOString().split('T')[0],
    });
  }
  return reviews;
}

/**
 * Maybe generate geo price (4% coverage)
 * PRD Field #69
 */
export function maybeGenerateGeoPrice(
  index: number,
  basePrice: string
): Array<{ country: string; price: string; currency: string }> | undefined {
  // ~4% = every 25th product
  if (index % 25 !== 0) return undefined;

  const price = parseFloat(basePrice);
  return [
    { country: 'US', price: basePrice, currency: 'USD' },
    { country: 'CA', price: (price * 1.35).toFixed(2), currency: 'CAD' },
    { country: 'UK', price: (price * 0.79).toFixed(2), currency: 'GBP' },
    { country: 'EU', price: (price * 0.92).toFixed(2), currency: 'EUR' },
  ];
}

/**
 * Maybe generate geo availability (4% coverage)
 * PRD Field #70
 */
export function maybeGenerateGeoAvailability(
  index: number
): Array<{ country: string; availability: 'in_stock' | 'out_of_stock' | 'preorder' }> | undefined {
  // ~4% = every 25th product
  if (index % 25 !== 0) return undefined;

  return [
    { country: 'US', availability: 'in_stock' },
    { country: 'CA', availability: index % 2 === 0 ? 'in_stock' : 'preorder' },
    { country: 'UK', availability: index % 3 === 0 ? 'out_of_stock' : 'in_stock' },
    { country: 'DE', availability: 'in_stock' },
  ];
}

// ============================================================================
// ENHANCED PRODUCT CREATION WITH ALL FIELDS
// ============================================================================

/**
 * Generate all optional fields for a product based on index
 * Updated to include PRD Section 9.1 additional required fields
 */
export function generateOptionalFields(
  category: string,
  brand: string,
  index: number,
  regularPrice?: string,
  stockStatus?: string
): {
  weight?: string;
  dimensions?: { length: string; width: string; height: string };
  gtin?: string;
  gtinType?: GtinType;
  gtinStorageMethod?: GtinStorageMethod;
  mpn?: string;
  material?: string;
  gender?: Gender;
  ageGroup?: AgeGroup;
  sizeSystem?: SizeSystem;
  saleDates?: SaleDateRange;
  videoLink?: string;
  model3dLink?: string;
  deliveryEstimate?: string;
  warning?: string;
  warningUrl?: string;
  ageRestriction?: number;
  // PRD Section 9.1 - Additional Required Fields
  unitPricingMeasure?: string;
  unitPricingBaseMeasure?: string;
  pricingTrend?: 'up' | 'down' | 'stable';
  availabilityDate?: string;
  expirationDate?: string;
  pickupMethod?: 'in_store' | 'curbside' | 'ship_to_store';
  pickupSla?: string;
  shippingInfo?: { country: string; price: string; service?: string };
  popularityScore?: number;
  returnRate?: number;
  qAndA?: Array<{ question: string; answer: string }>;
  rawReviewData?: Array<{ reviewer: string; rating: number; text: string; date: string }>;
  geoPrice?: Array<{ country: string; price: string; currency: string }>;
  geoAvailability?: Array<{ country: string; availability: 'in_stock' | 'out_of_stock' | 'preorder' }>;
} {
  const gtinData = maybeGenerateGtin(index);
  const warningData = maybeGenerateWarning(index);
  const unitPricingMeasure = maybeGenerateUnitPricingMeasure(index);
  const pickupMethod = maybeGeneratePickupMethod(index);
  const basePrice = regularPrice || '29.99';

  return {
    // Existing fields
    weight: maybeGenerateWeight(category, index),
    dimensions: maybeGenerateDimensions(category, index),
    gtin: gtinData?.gtin,
    gtinType: gtinData?.gtinType,
    gtinStorageMethod: gtinData?.gtinStorageMethod,
    mpn: maybeGenerateMpn(category, brand, index),
    material: maybeGenerateMaterial(category, index),
    gender: maybeGenerateGender(index),
    ageGroup: maybeGenerateAgeGroup(index),
    sizeSystem: maybeGenerateSizeSystem(category, index),
    saleDates: maybeGenerateSaleDates(index),
    videoLink: maybeGenerateVideoLink(index),
    model3dLink: maybeGenerateModel3dLink(index),
    deliveryEstimate: maybeGenerateDeliveryEstimate(index),
    warning: warningData?.warning,
    warningUrl: warningData?.warningUrl,
    ageRestriction: maybeGenerateAgeRestriction(index),
    // PRD Section 9.1 - Additional Required Fields
    unitPricingMeasure,
    unitPricingBaseMeasure: maybeGenerateUnitPricingBaseMeasure(unitPricingMeasure),
    pricingTrend: maybeGeneratePricingTrend(index),
    availabilityDate: maybeGenerateAvailabilityDate(index, stockStatus),
    expirationDate: maybeGenerateExpirationDate(index),
    pickupMethod,
    pickupSla: maybeGeneratePickupSla(index, pickupMethod),
    shippingInfo: maybeGenerateShippingInfo(index),
    popularityScore: maybeGeneratePopularityScore(index),
    returnRate: maybeGenerateReturnRate(index),
    qAndA: maybeGenerateQAndA(index),
    rawReviewData: maybeGenerateRawReviewData(index),
    geoPrice: maybeGenerateGeoPrice(index, basePrice),
    geoAvailability: maybeGenerateGeoAvailability(index),
  };
}
