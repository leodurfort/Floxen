/**
 * Winter Sports Product Definitions
 * 50 simple products: 25 skis + 25 snowboards
 *
 * All products have 100% coverage of required feed fields:
 * - id (SKU)
 * - title (name)
 * - description
 * - product_category
 * - material (100% coverage)
 * - weight (100% coverage)
 * - image_link
 * - price
 * - availability (stock_status)
 * - inventory_quantity
 * - gtin (100% coverage - EAN-13 format, stored via global_unique_id)
 */

import { SimpleProductDefinition, BrandStorageMethod, Gender, GtinStorageMethod, GtinType } from '@/types/product';
import { getWinterSportsBrand } from './brands';
import { getWinterSportsGallery } from './images';

// ============================================================================
// GTIN GENERATION (EAN-13 for all products)
// ============================================================================

/**
 * Calculate GTIN check digit using the standard algorithm
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
 * Generate a valid EAN-13 for winter sports products
 * Uses prefix 4006381 (fictional GS1 prefix for test data)
 */
function generateWinterSportsEAN13(category: 'skis' | 'snowboards', index: number): string {
  // Different prefix segment for skis vs snowboards
  const categoryCode = category === 'skis' ? '1' : '2';
  const prefix = `400638${categoryCode}`; // 7 digits
  const item = String(index).padStart(5, '0'); // 5 digits
  const base = prefix + item; // 12 digits
  return base + calculateGtinCheckDigit(base); // 13 digits total
}

// ============================================================================
// SKI PRODUCT DEFINITIONS
// ============================================================================

const SKI_NAMES = [
  'All-Mountain Pro',
  'Carving Master',
  'Powder King',
  'Freeride Explorer',
  'Racing Elite',
  'Touring Lite',
  'Park Freestyle',
  'Mogul Buster',
  'Backcountry Adventure',
  'Slalom Champion',
  'Giant Slalom GS',
  'Downhill Racer',
  'All-Terrain Cruiser',
  'Expert Performance',
  'Beginner Friendly',
  'Intermediate Plus',
  'Women\'s Carver',
  'Junior Racer',
  'Wide Body Powder',
  'Lightweight Carbon',
  'Twin Tip Freestyle',
  'Demo Performance',
  'Limited Edition Pro',
  'Classic Cambered',
  'Rocker Profile All-Mtn',
];

const SKI_MATERIALS = [
  'Carbon Fiber Core with Titanal Reinforcement',
  'Wood Core with Fiberglass Laminate',
  'Paulownia Wood Core with Carbon Stringers',
  'Full Poplar Wood Core with Metal Edges',
  'Bamboo Core with Basalt Fiber',
  'Composite Foam Core with Fiberglass',
  'Ash and Poplar Wood Core',
  'Carbon and Flax Fiber Construction',
  'Lightweight Foam Core with Kevlar',
  'Maple Wood Core with Titanium Layer',
];

const SKI_DESCRIPTIONS = [
  'Engineered for versatility across all mountain conditions. Features advanced dampening technology for smooth, stable rides at any speed.',
  'Precision-crafted for aggressive carvers who demand edge-to-edge performance. Quick turn initiation with powerful rebound.',
  'Designed for deep powder days with a wide waist and early rise tip. Float effortlessly through fresh snow.',
  'Built for adventurers who explore beyond the groomed runs. Robust construction handles variable terrain with ease.',
  'Competition-ready performance with race-proven geometry. Delivers maximum power transfer and edge grip.',
  'Lightweight touring design for uphill efficiency without sacrificing downhill performance. Includes touring-compatible bindings mount.',
  'Playful twin-tip design for park riders. Soft flex pattern for butters, presses, and switch riding.',
  'Quick-turning agility for navigating bumps and moguls. Shock-absorbing core reduces fatigue.',
  'Rugged construction for off-piste exploration. Wide platform for stability in unpredictable conditions.',
  'Razor-sharp edge hold for slalom racing. Short turn radius for quick direction changes.',
];

// ============================================================================
// SNOWBOARD PRODUCT DEFINITIONS
// ============================================================================

const SNOWBOARD_NAMES = [
  'All-Mountain Dominator',
  'Freestyle Park',
  'Powder Surfer',
  'Freeride Beast',
  'Carving Machine',
  'Splitboard Touring',
  'Halfpipe Pro',
  'Street Jib Master',
  'Backcountry Explorer',
  'Speed Demon',
  'Women\'s All-Mtn',
  'Youth Progression',
  'Camber Classic',
  'Rocker Playful',
  'Hybrid Profile',
  'Stiff Response',
  'Soft Flex Park',
  'Directional Powder',
  'True Twin Freestyle',
  'Volume Shifted Wide',
  'Carbon Race',
  'Sustainable Eco',
  'Limited Artist Series',
  'Retro Throwback',
  'Next Gen Tech',
];

const SNOWBOARD_MATERIALS = [
  'Sintered P-tex Base with Carbon Fiber Top',
  'Poplar Wood Core with Triaxial Fiberglass',
  'Paulownia and Aspen Wood Core Blend',
  'Bamboo Stringers with Basalt Fiber Reinforcement',
  'Bio-Resin Construction with Recycled Materials',
  'Full Camber Poplar Core with Metal Edges',
  'Lightweight Foam Core with Kevlar Sidewalls',
  'Ash Wood Core with Carbon V-Rods',
  'FSC Certified Wood Core with Flax Fiber',
  'Dual-Zone EPS Core with Fiberglass Biax',
];

const SNOWBOARD_DESCRIPTIONS = [
  'The ultimate all-mountain weapon. Responsive in all conditions from groomers to powder to park.',
  'Built for progression in the terrain park. Forgiving flex with poppy response for tricks.',
  'Designed to float in deep powder. Setback stance and tapered nose for maximum surf feel.',
  'Aggressive freeride performance for charging hard. Stiff flex for high-speed stability.',
  'Euro-carve ready with a narrow waist and aggressive sidecut. Lay trenches on groomers.',
  'Lightweight splitboard for backcountry adventures. Efficient climbing with solid ride down.',
  'Pipe-specific shape with extended effective edge. Perfect for wall-to-wall transitions.',
  'Urban-inspired design for street features. Soft flex for presses and technical tricks.',
  'Rugged construction for exploring the sidecountry. Versatile shape handles all terrain.',
  'Stiff and damp for maximum speed. Built for riders who love to go fast.',
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a SKU for winter sports products
 */
function generateWinterSportsSku(
  category: 'skis' | 'snowboards',
  brand: string,
  index: number
): string {
  const catCode = category === 'skis' ? 'SKI' : 'SNB';
  const brandCode = brand.substring(0, 3).toUpperCase().replace(/\s/g, '');
  const numPart = String(index).padStart(3, '0');
  return `${catCode}-${brandCode}-${numPart}`;
}

/**
 * Generate weight for skis (typically 1.5-2.5 kg per ski, so 3-5 kg pair)
 */
function generateSkiWeight(index: number): string {
  const baseWeight = 3.2 + (index % 10) * 0.2;
  return baseWeight.toFixed(1);
}

/**
 * Generate weight for snowboards (typically 2.5-4 kg)
 */
function generateSnowboardWeight(index: number): string {
  const baseWeight = 2.8 + (index % 10) * 0.15;
  return baseWeight.toFixed(1);
}

/**
 * Generate dimensions for skis (length varies by model)
 */
function generateSkiDimensions(index: number): { length: string; width: string; height: string } {
  // Ski lengths typically 150-185 cm
  const length = 155 + (index % 7) * 5;
  // Waist width 70-120mm
  const width = 7.2 + (index % 5) * 1.0;
  return {
    length: String(length),
    width: width.toFixed(1),
    height: '1.5', // Thickness
  };
}

/**
 * Generate dimensions for snowboards (length varies by model)
 */
function generateSnowboardDimensions(index: number): { length: string; width: string; height: string } {
  // Snowboard lengths typically 140-165 cm
  const length = 145 + (index % 5) * 4;
  // Width 24-27 cm
  const width = 24.5 + (index % 5) * 0.5;
  return {
    length: String(length),
    width: width.toFixed(1),
    height: '1.2', // Thickness
  };
}

/**
 * Generate price for skis ($299-$999)
 */
function generateSkiPrice(index: number): string {
  const prices = [299.99, 399.99, 449.99, 549.99, 599.99, 699.99, 749.99, 849.99, 899.99, 999.99];
  return prices[index % prices.length].toFixed(2);
}

/**
 * Generate price for snowboards ($249-$799)
 */
function generateSnowboardPrice(index: number): string {
  const prices = [249.99, 299.99, 349.99, 399.99, 449.99, 499.99, 549.99, 599.99, 699.99, 799.99];
  return prices[index % prices.length].toFixed(2);
}

/**
 * Generate stock data (realistic inventory)
 */
function generateStock(index: number): { quantity: number; status: 'instock' | 'outofstock' | 'onbackorder' } {
  // 80% in stock, 10% low stock (backorder), 10% out of stock
  const mod = index % 10;
  if (mod === 9) {
    return { quantity: 0, status: 'outofstock' };
  } else if (mod === 8) {
    return { quantity: 2, status: 'onbackorder' };
  }
  return { quantity: 5 + (index % 20), status: 'instock' };
}

/**
 * Get gender targeting (most are unisex, some women-specific)
 */
function getGender(index: number, name: string): Gender {
  if (name.toLowerCase().includes('women')) return 'female';
  if (name.toLowerCase().includes('junior') || name.toLowerCase().includes('youth')) return 'unisex';
  // 20% women-specific otherwise
  if (index % 5 === 0) return 'female';
  return 'unisex';
}

// ============================================================================
// PRODUCT GENERATION
// ============================================================================

/**
 * Generate all ski products (25 simple products)
 */
function generateSkiProducts(): SimpleProductDefinition[] {
  const products: SimpleProductDefinition[] = [];

  for (let i = 0; i < 25; i++) {
    const brand = getWinterSportsBrand('skis', i);
    const name = SKI_NAMES[i];
    const fullName = `${brand.name} ${name} Skis`;
    const price = generateSkiPrice(i);
    const stock = generateStock(i);
    const material = SKI_MATERIALS[i % SKI_MATERIALS.length];
    const description = SKI_DESCRIPTIONS[i % SKI_DESCRIPTIONS.length];

    products.push({
      type: 'simple',
      sku: generateWinterSportsSku('skis', brand.name, i),
      name: fullName,
      description: `${fullName}: ${description}`,
      shortDescription: `${brand.name} ${name} - Premium performance skis.`,
      categories: ['skis'],
      brand: brand.name,
      brandStorageMethod: 'taxonomy' as BrandStorageMethod,
      regularPrice: price,
      salePrice: i % 4 === 0 ? (parseFloat(price) * 0.85).toFixed(2) : undefined, // 25% on sale
      stockQuantity: stock.quantity,
      stockStatus: stock.status,
      manageStock: true,
      // Required fields - 100% coverage
      material,
      weight: generateSkiWeight(i),
      dimensions: generateSkiDimensions(i),
      gender: getGender(i, name),
      ageGroup: name.toLowerCase().includes('junior') ? 'kids' : 'adult',
      // GTIN - 100% coverage with EAN-13
      gtin: generateWinterSportsEAN13('skis', i),
      gtinType: 'EAN-13' as GtinType,
      gtinStorageMethod: 'global_unique_id' as GtinStorageMethod,
      // Product images (cycles through 14 available images)
      images: getWinterSportsGallery(i, 1),
    });
  }

  return products;
}

/**
 * Generate all snowboard products (25 simple products)
 */
function generateSnowboardProducts(): SimpleProductDefinition[] {
  const products: SimpleProductDefinition[] = [];

  for (let i = 0; i < 25; i++) {
    const brand = getWinterSportsBrand('snowboards', i);
    const name = SNOWBOARD_NAMES[i];
    const fullName = `${brand.name} ${name} Snowboard`;
    const price = generateSnowboardPrice(i);
    const stock = generateStock(i);
    const material = SNOWBOARD_MATERIALS[i % SNOWBOARD_MATERIALS.length];
    const description = SNOWBOARD_DESCRIPTIONS[i % SNOWBOARD_DESCRIPTIONS.length];

    products.push({
      type: 'simple',
      sku: generateWinterSportsSku('snowboards', brand.name, i),
      name: fullName,
      description: `${fullName}: ${description}`,
      shortDescription: `${brand.name} ${name} - High-performance snowboard.`,
      categories: ['snowboards'],
      brand: brand.name,
      brandStorageMethod: 'taxonomy' as BrandStorageMethod,
      regularPrice: price,
      salePrice: i % 4 === 0 ? (parseFloat(price) * 0.8).toFixed(2) : undefined, // 25% on sale
      stockQuantity: stock.quantity,
      stockStatus: stock.status,
      manageStock: true,
      // Required fields - 100% coverage
      material,
      weight: generateSnowboardWeight(i),
      dimensions: generateSnowboardDimensions(i),
      gender: getGender(i, name),
      ageGroup: name.toLowerCase().includes('youth') ? 'kids' : 'adult',
      // GTIN - 100% coverage with EAN-13
      gtin: generateWinterSportsEAN13('snowboards', i),
      gtinType: 'EAN-13' as GtinType,
      gtinStorageMethod: 'global_unique_id' as GtinStorageMethod,
      // Product images (cycles through 14 available images, offset by 25 to vary from skis)
      images: getWinterSportsGallery(i + 25, 1),
    });
  }

  return products;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const SKI_PRODUCTS = generateSkiProducts();
export const SNOWBOARD_PRODUCTS = generateSnowboardProducts();

export const ALL_WINTER_SPORTS_PRODUCTS = [...SKI_PRODUCTS, ...SNOWBOARD_PRODUCTS];

export const WINTER_SPORTS_PRODUCT_COUNTS = {
  total: ALL_WINTER_SPORTS_PRODUCTS.length,
  skis: SKI_PRODUCTS.length,
  snowboards: SNOWBOARD_PRODUCTS.length,
};
