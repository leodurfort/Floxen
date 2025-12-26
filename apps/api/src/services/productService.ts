import { prisma } from '../lib/prisma';
import { SyncStatus, Prisma } from '@prisma/client';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════
// LIST PRODUCTS OPTIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface ListProductsOptions {
  page?: number;
  limit?: number;
  sortBy?: 'wooProductId' | 'wooTitle' | 'wooPrice' | 'wooStockQuantity' | 'syncStatus' | 'isValid' | 'feedEnableSearch' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  search?: string;
  syncStatus?: SyncStatus[];
  isValid?: boolean;
  feedEnableSearch?: boolean;
  wooStockStatus?: string[];
  hasOverrides?: boolean;
}

/**
 * Get IDs of parent variable products (products that have variations).
 * These are identified by finding all distinct wooParentId values from products that have a parent.
 */
export async function getParentProductIds(shopId: string): Promise<number[]> {
  const parentProductIds = await prisma.product.findMany({
    where: {
      shopId,
      wooParentId: { not: null },
    },
    select: { wooParentId: true },
    distinct: ['wooParentId'],
  });

  return parentProductIds.map(p => p.wooParentId).filter((id): id is number => id !== null);
}

/**
 * Build Prisma WHERE clause from filter options
 */
function buildWhereClause(
  shopId: string,
  parentIds: number[],
  options: ListProductsOptions
): Prisma.ProductWhereInput {
  const {
    search,
    syncStatus,
    isValid,
    feedEnableSearch,
    wooStockStatus,
    hasOverrides,
  } = options;

  const where: Prisma.ProductWhereInput = {
    shopId,
    wooProductId: { notIn: parentIds },
  };

  // Text search on title and SKU
  if (search && search.trim()) {
    where.OR = [
      { wooTitle: { contains: search.trim(), mode: 'insensitive' } },
      { wooSku: { contains: search.trim(), mode: 'insensitive' } },
    ];
  }

  // Multi-select sync status filter
  if (syncStatus && syncStatus.length > 0) {
    where.syncStatus = { in: syncStatus };
  }

  // Boolean filters
  if (isValid !== undefined) {
    where.isValid = isValid;
  }

  if (feedEnableSearch !== undefined) {
    where.feedEnableSearch = feedEnableSearch;
  }

  // Multi-select stock status filter
  if (wooStockStatus && wooStockStatus.length > 0) {
    where.wooStockStatus = { in: wooStockStatus };
  }

  // Has overrides filter (check if productFieldOverrides is not empty)
  if (hasOverrides !== undefined) {
    if (hasOverrides) {
      // Products with non-empty overrides
      where.NOT = {
        OR: [
          { productFieldOverrides: { equals: Prisma.JsonNull } },
          { productFieldOverrides: { equals: {} } },
        ],
      };
    } else {
      // Products with empty or null overrides
      where.OR = [
        ...(where.OR || []),
        { productFieldOverrides: { equals: Prisma.JsonNull } },
        { productFieldOverrides: { equals: {} } },
      ];
      // If we already have OR from search, we need to restructure
      if (search && search.trim()) {
        where.AND = [
          {
            OR: [
              { wooTitle: { contains: search.trim(), mode: 'insensitive' } },
              { wooSku: { contains: search.trim(), mode: 'insensitive' } },
            ],
          },
          {
            OR: [
              { productFieldOverrides: { equals: Prisma.JsonNull } },
              { productFieldOverrides: { equals: {} } },
            ],
          },
        ];
        delete where.OR;
      }
    }
  }

  return where;
}

export async function listProducts(shopId: string, options: ListProductsOptions = {}) {
  const {
    page = 1,
    limit = 20,
    sortBy = 'updatedAt',
    sortOrder = 'desc',
  } = options;

  const skip = (page - 1) * limit;
  const parentIds = await getParentProductIds(shopId);
  const where = buildWhereClause(shopId, parentIds, options);

  // Build order by clause
  const orderBy: Prisma.ProductOrderByWithRelationInput = {
    [sortBy]: sortOrder,
  };

  // Exclude products that are parent variable products (have children)
  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Get filtered product IDs for bulk update operations
 * Returns all product IDs matching the filter criteria (no pagination)
 */
export async function getFilteredProductIds(
  shopId: string,
  options: Omit<ListProductsOptions, 'page' | 'limit' | 'sortBy' | 'sortOrder'>
): Promise<string[]> {
  const parentIds = await getParentProductIds(shopId);
  const where = buildWhereClause(shopId, parentIds, options);

  const products = await prisma.product.findMany({
    where,
    select: { id: true },
  });

  return products.map(p => p.id);
}

export async function getProduct(shopId: string, productId: string) {
  return prisma.product.findFirst({ where: { id: productId, shopId } });
}

export async function updateProduct(
  shopId: string,
  productId: string,
  data: Partial<Parameters<typeof prisma.product.update>[0]['data']>,
) {
  return prisma.product.update({
    where: { id: productId },
    data: { ...data, updatedAt: new Date() },
  });
}

export function checksum(data: unknown) {
  return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
}

export function transformWooProduct(woo: any, shopCurrency: string) {
  return {
    wooProductId: woo.id,
    wooParentId: woo.parent_id || null,
    wooTitle: woo.name,
    wooDescription: woo.description,
    wooSku: woo.sku,
    wooPrice: woo.price ? Number(woo.price) : null,
    wooSalePrice: woo.sale_price ? Number(woo.sale_price) : null,
    wooStockStatus: woo.stock_status,
    wooStockQuantity: woo.stock_quantity,
    wooCategories: woo.categories,
    wooImages: woo.images,
    wooAttributes: woo.attributes,
    wooPermalink: woo.permalink,
    wooDateModified: woo.date_modified ? new Date(woo.date_modified) : null,
    wooRawJson: woo,
    feedPrice: woo.price ? `${woo.price} ${shopCurrency}` : null,
    feedAvailability: woo.stock_status === 'instock' ? 'in_stock' : woo.stock_status,
    checksum: checksum(woo),
    updatedAt: new Date(),
  };
}

/**
 * Merges parent variable product data with variation data
 *
 * PARENT FALLBACK STRATEGY:
 * - All parent fields are used as base/default values
 * - Variation fields override ONLY if they have a non-null/non-empty value
 * - If a variation field is null/empty, the parent's value is used automatically
 *
 * SPECIAL CASES:
 * - ID, SKU, stock: Always from variation (variations have independent values)
 * - Images: Variation image as primary, parent images as additional
 * - Attributes: Merged (parent attributes + variation-specific color/size)
 * - Meta data: Merged (variation meta overrides parent for same key)
 * - Categories, Tags, Brands: Always inherited from parent (variations don't have these)
 *
 * This ensures that variations never have missing data - any null field
 * automatically falls back to the parent product's value.
 */
export function mergeParentAndVariation(parent: any, variation: any, shopCurrency: string) {
  // Get variation attributes as key-value pairs
  const varAttrs = variation.attributes?.reduce((acc: any, attr: any) => {
    acc[attr.name.toLowerCase()] = attr.option;
    return acc;
  }, {}) || {};

  // Merge images: variation image as primary, parent images as additional
  const variationImage = variation.image?.src ? [variation.image] : [];
  const parentImages = parent.images || [];
  const mergedImages = [...variationImage, ...parentImages];

  // Weight and dimensions: use variation if different from parent, otherwise use parent
  const weight = (variation.weight && variation.weight !== parent.weight) ? variation.weight : parent.weight;
  const dimensions = {
    length: (variation.dimensions?.length && variation.dimensions.length !== parent.dimensions?.length)
      ? variation.dimensions.length
      : parent.dimensions?.length || '',
    width: (variation.dimensions?.width && variation.dimensions.width !== parent.dimensions?.width)
      ? variation.dimensions.width
      : parent.dimensions?.width || '',
    height: (variation.dimensions?.height && variation.dimensions.height !== parent.dimensions?.height)
      ? variation.dimensions.height
      : parent.dimensions?.height || ''
  };

  // Price: use variation price if provided, otherwise fallback to parent
  const price = variation.price ? variation.price : parent.price || '';
  const regularPrice = variation.regular_price ? variation.regular_price : parent.regular_price || '';
  const salePrice = variation.sale_price ? variation.sale_price : parent.sale_price || '';

  // Build attributes array: convert parent attributes to variation format
  // Parent attributes have "options" array, variations need "option" string
  const mergedAttributes: any[] = [];

  // Start with parent attributes, but convert to variation format
  (parent.attributes || []).forEach((attr: any) => {
    const attrName = attr.name.toLowerCase();

    // Skip color and size - we'll add these from variation
    if (attrName === 'color' || attrName === 'colour' || attrName === 'size') {
      return;
    }

    // Convert parent's "options" array to variation's "option" string
    // BUT: use variation's specific value if it exists (fixes variant-level attribute override)
    if (Array.isArray(attr.options) && attr.options.length > 0) {
      // Check if variation has a specific value for this attribute
      const variationValue = varAttrs[attrName];

      const converted = {
        id: attr.id || 0,
        name: attr.name,
        option: variationValue || (attr.options.length === 1 ? attr.options[0] : attr.options.join(', '))
      };
      mergedAttributes.push(converted);
    }
  });

  // Track which attributes we've already added from parent
  const addedAttrNames = new Set(mergedAttributes.map((a: any) => a.name.toLowerCase()));

  // Add color attribute if found in variation
  if (varAttrs.color || varAttrs.colour) {
    mergedAttributes.push({
      id: 0,
      name: 'Color',
      option: varAttrs.color || varAttrs.colour
    });
    addedAttrNames.add('color');
    addedAttrNames.add('colour');
  }

  // Add size attribute if found in variation
  if (varAttrs.size) {
    mergedAttributes.push({
      id: 0,
      name: 'Size',
      option: varAttrs.size
    });
    addedAttrNames.add('size');
  }

  // Add any remaining variation-only attributes not already covered by parent or color/size
  Object.entries(varAttrs).forEach(([attrName, attrValue]) => {
    if (!addedAttrNames.has(attrName) && attrValue) {
      // Find original attribute name casing from variation
      const originalAttr = variation.attributes?.find((a: any) => a.name.toLowerCase() === attrName);
      mergedAttributes.push({
        id: originalAttr?.id || 0,
        name: originalAttr?.name || attrName.charAt(0).toUpperCase() + attrName.slice(1),
        option: attrValue as string
      });
      addedAttrNames.add(attrName);
    }
  });

  // COMPREHENSIVE PARENT FALLBACK STRATEGY:
  // 1. Start with all parent fields as base
  // 2. Override with variation fields that have values (not null/empty)
  // 3. Special handling for arrays and objects that need merging (images, attributes, meta_data)

  // Helper function to check if a value is "empty"
  const isEmpty = (val: any): boolean => {
    if (val === null || val === undefined) return true;
    if (typeof val === 'string' && val.trim() === '') return true;
    if (Array.isArray(val) && val.length === 0) return true;
    return false;
  };

  // Start with parent as base (shallow copy)
  const merged: any = { ...parent };

  // Override with variation fields (skip empty values - they should fallback to parent)
  Object.keys(variation).forEach(key => {
    const varValue = variation[key];

    // Skip arrays and objects - we'll handle these specially
    if (typeof varValue === 'object' && varValue !== null) {
      return;
    }

    // Only override if variation has a non-empty value
    if (!isEmpty(varValue)) {
      merged[key] = varValue;
    }
  });

  // SPECIAL HANDLING FOR SPECIFIC FIELDS:

  // ID: Always use variation ID
  merged.id = variation.id;
  merged.parent_id = parent.id;

  // SKU: Use variation SKU, fallback to parent SKU
  merged.sku = variation.sku || parent.sku || '';

  // Permalink: Use variation permalink or parent
  merged.permalink = variation.permalink || parent.permalink;

  // Stock: Use variation's stock data (variations have independent stock)
  merged.stock_status = variation.stock_status || '';
  merged.stock_quantity = variation.stock_quantity !== null ? variation.stock_quantity : null;
  merged.manage_stock = variation.manage_stock ?? parent.manage_stock ?? false;

  // Pricing: Use variation price or parent fallback
  merged.price = price;
  merged.regular_price = regularPrice;
  merged.sale_price = salePrice;

  // Weight and Dimensions: Smart merging (already calculated)
  merged.weight = weight || '';
  merged.dimensions = dimensions;

  // Images: Variation image as primary, parent images as additional
  merged.images = mergedImages;

  // Attributes: Merged attributes including variation-specific ones (color, size)
  merged.attributes = mergedAttributes;

  // Meta data: Merge both arrays (variation meta overrides parent if same key)
  const parentMeta = parent.meta_data || [];
  const variationMeta = variation.meta_data || [];
  const variationMetaKeys = new Set(variationMeta.map((m: any) => m.key));

  // Keep parent meta that's not overridden by variation, plus all variation meta
  merged.meta_data = [
    ...parentMeta.filter((m: any) => !variationMetaKeys.has(m.key)),
    ...variationMeta
  ];

  // Categories, Tags, Brands: Always inherit from parent (variations don't have these)
  merged.categories = parent.categories || [];
  merged.tags = parent.tags || [];
  merged.brands = parent.brands || [];

  // Date modified: Use variation's or parent's
  merged.date_modified = variation.date_modified || parent.date_modified;

  // Construct a better product name: "Parent Name - Variation Attributes"
  // Use parent name + variation name for better display
  if (parent.name && variation.name) {
    merged.name = `${parent.name} - ${variation.name}`;
  }

  return transformWooProduct(merged, shopCurrency);
}
