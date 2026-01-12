/**
 * Bag product definitions
 * 45 total: 20 simple, 22 variable, 3 grouped
 */

import { ProductDefinition, ProductAttribute, VariationDefinition } from '@/types/product';
import {
  createSimpleProduct,
  createVariableProduct,
  createGroupedProduct,
  randomPrice,
  maybeSalePrice,
  randomStockStatus,
  COLORS,
} from '../product-generator-helpers';

const CATEGORY = 'bags';

const BAG_ATTRIBUTES: ProductAttribute[] = [
  { name: 'Color', options: COLORS.slice(0, 5), visible: true, variation: true },
  { name: 'Size', options: ['Small', 'Medium', 'Large'], visible: true, variation: true },
];

function createBagVariations(
  baseSku: string,
  attrs: ProductAttribute[],
  basePrice: string
): VariationDefinition[] {
  const variations: VariationDefinition[] = [];
  const colors = attrs.find((a) => a.name === 'Color')?.options || COLORS.slice(0, 4);
  const sizes = attrs.find((a) => a.name === 'Size')?.options || ['Small', 'Medium', 'Large'];

  colors.forEach((color) => {
    sizes.forEach((size) => {
      const stock = randomStockStatus();
      // Larger sizes cost more
      const priceMultiplier = size === 'Large' ? 1.2 : size === 'Medium' ? 1.1 : 1;
      const price = (parseFloat(basePrice) * priceMultiplier).toFixed(2);

      variations.push({
        sku: `${baseSku}-${color.substring(0, 3).toUpperCase()}-${size.charAt(0)}`,
        regularPrice: price,
        salePrice: maybeSalePrice(price),
        stockQuantity: stock.quantity,
        stockStatus: stock.status,
        attributes: { Color: color, Size: size },
      });
    });
  });

  return variations;
}

export function generateBags(): ProductDefinition[] {
  const products: ProductDefinition[] = [];

  // Simple products (20)
  for (let i = 0; i < 20; i++) {
    products.push(createSimpleProduct(CATEGORY, i));
  }

  // Variable products (22)
  for (let i = 20; i < 42; i++) {
    const basePrice = randomPrice(CATEGORY);
    products.push(
      createVariableProduct(
        CATEGORY,
        i,
        BAG_ATTRIBUTES,
        (baseSku, attrs) => createBagVariations(baseSku, attrs, basePrice)
      )
    );
  }

  // Grouped products (3)
  const simpleSkus = products
    .filter((p) => p.type === 'simple')
    .map((p) => p.sku);

  for (let i = 0; i < 3; i++) {
    const childSkus = simpleSkus.slice(i * 6, i * 6 + 6);
    if (childSkus.length >= 2) {
      products.push(createGroupedProduct(CATEGORY, 42 + i, childSkus));
    }
  }

  return products;
}

export const BAG_PRODUCTS = generateBags();
