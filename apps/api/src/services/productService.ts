import { prisma } from '../lib/prisma';
import { ProductStatus, SyncStatus } from '@prisma/client';
import crypto from 'crypto';
import { logger } from '../lib/logger';

export async function listProducts(shopId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  // Get all product IDs that are used as parent IDs (these are parent variable products)
  const parentProductIds = await prisma.product.findMany({
    where: {
      shopId,
      wooParentId: { not: null },
    },
    select: { wooParentId: true },
    distinct: ['wooParentId'],
  });

  const parentIds = parentProductIds.map(p => p.wooParentId).filter((id): id is number => id !== null);

  // Exclude products that are parent variable products (have children)
  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where: {
        shopId,
        wooProductId: { notIn: parentIds },
      },
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.product.count({
      where: {
        shopId,
        wooProductId: { notIn: parentIds },
      },
    }),
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

export async function markEnrichmentQueued(shopId: string, productId: string) {
  return prisma.product.update({
    where: { id: productId },
    data: {
      aiEnriched: false,
      status: ProductStatus.PENDING_REVIEW,
      syncStatus: SyncStatus.PENDING,
    },
  });
}

export function buildFeedPreview(product: { wooProductId: number; wooTitle: string; wooDescription?: string | null; wooPrice?: any; syncStatus: SyncStatus }, shopId: string) {
  return {
    id: `${shopId}-${product.wooProductId}`,
    title: product.wooTitle,
    description: product.wooDescription,
    availability: product.syncStatus === SyncStatus.COMPLETED ? 'in_stock' : 'preorder',
    price: product.wooPrice ? `${product.wooPrice} USD` : null,
  };
}

export function checksum(data: unknown) {
  return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
}

export function transformWooProduct(woo: any, shopCurrency: string) {
  logger.info('woo:transform product', { wooProductId: woo?.id, title: woo?.name });
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
  logger.info('woo:merge variation', {
    parentId: parent?.id,
    variationId: variation?.id,
    variationAttributes: variation?.attributes
  });

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

  // Build attributes array with color and size from variation attributes
  const mergedAttributes = [...(parent.attributes || [])];

  // Add color attribute if found in variation
  if (varAttrs.color || varAttrs.colour) {
    mergedAttributes.push({
      id: 0,
      name: 'Color',
      option: varAttrs.color || varAttrs.colour
    });
  }

  // Add size attribute if found in variation
  if (varAttrs.size) {
    mergedAttributes.push({
      id: 0,
      name: 'Size',
      option: varAttrs.size
    });
  }

  // Material: inherit from parent if variation doesn't have it
  const parentMaterial = parent.attributes?.find((attr: any) =>
    attr.name.toLowerCase() === 'material'
  );
  const variationMaterial = variation.attributes?.find((attr: any) =>
    attr.name.toLowerCase() === 'material'
  );

  if (parentMaterial && !variationMaterial) {
    mergedAttributes.push(parentMaterial);
  }

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

  // SKU: Use variation SKU or empty (variations often have unique SKUs)
  merged.sku = variation.sku || '';

  // Permalink: Use variation permalink or parent
  merged.permalink = variation.permalink || parent.permalink;

  // Stock: Use variation's stock data (variations have independent stock)
  merged.stock_status = variation.stock_status || '';
  merged.stock_quantity = variation.stock_quantity !== null ? variation.stock_quantity : null;
  merged.manage_stock = variation.manage_stock || parent.manage_stock || false;

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

  return transformWooProduct(merged, shopCurrency);
}
