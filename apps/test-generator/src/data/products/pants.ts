/**
 * Pants product definitions
 * 45 total: 12 simple, 28 variable, 5 grouped
 */

import { ProductDefinition, ProductAttribute, VariationDefinition } from '@/types/product';
import {
  createSimpleProduct,
  createVariableProduct,
  createGroupedProduct,
  randomPrice,
  maybeSalePrice,
  randomStockStatus,
  SIZES,
  COLORS,
} from '../product-generator-helpers';

const CATEGORY = 'pants';

const PANTS_ATTRIBUTES: ProductAttribute[] = [
  { name: 'Waist', options: SIZES.PANTS_WAIST, visible: true, variation: true },
  { name: 'Length', options: SIZES.PANTS_LENGTH, visible: true, variation: true },
  { name: 'Color', options: COLORS.slice(0, 4), visible: true, variation: true },
];

function createPantsVariations(
  baseSku: string,
  attrs: ProductAttribute[],
  basePrice: string
): VariationDefinition[] {
  const variations: VariationDefinition[] = [];
  const waists = attrs.find((a) => a.name === 'Waist')?.options || SIZES.PANTS_WAIST;
  const lengths = attrs.find((a) => a.name === 'Length')?.options || SIZES.PANTS_LENGTH;
  const colors = attrs.find((a) => a.name === 'Color')?.options || COLORS.slice(0, 3);

  // Limit to avoid too many variations
  waists.slice(0, 5).forEach((waist) => {
    lengths.forEach((length) => {
      colors.slice(0, 2).forEach((color) => {
        const stock = randomStockStatus();
        variations.push({
          sku: `${baseSku}-W${waist}-L${length}-${color.substring(0, 3).toUpperCase()}`,
          regularPrice: basePrice,
          salePrice: maybeSalePrice(basePrice),
          stockQuantity: stock.quantity,
          stockStatus: stock.status,
          attributes: { Waist: waist, Length: length, Color: color },
        });
      });
    });
  });

  return variations;
}

export function generatePants(): ProductDefinition[] {
  const products: ProductDefinition[] = [];

  // Simple products (12)
  for (let i = 0; i < 12; i++) {
    products.push(createSimpleProduct(CATEGORY, i));
  }

  // Variable products (28)
  for (let i = 12; i < 40; i++) {
    const basePrice = randomPrice(CATEGORY);
    products.push(
      createVariableProduct(
        CATEGORY,
        i,
        PANTS_ATTRIBUTES,
        (baseSku, attrs) => createPantsVariations(baseSku, attrs, basePrice)
      )
    );
  }

  // Grouped products (5)
  const simpleSkus = products
    .filter((p) => p.type === 'simple')
    .map((p) => p.sku);

  for (let i = 0; i < 5; i++) {
    const childSkus = simpleSkus.slice(i * 2, i * 2 + 3);
    if (childSkus.length >= 2) {
      products.push(createGroupedProduct(CATEGORY, 40 + i, childSkus));
    }
  }

  return products;
}

export const PANTS_PRODUCTS = generatePants();
