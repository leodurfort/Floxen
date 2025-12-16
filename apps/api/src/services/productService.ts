import { prisma } from '../lib/prisma';
import { ProductStatus, SyncStatus } from '@prisma/client';
import crypto from 'crypto';
import { logger } from '../lib/logger';

export async function listProducts(shopId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where: { shopId },
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.product.count({ where: { shopId } }),
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
 * Variations override: permalink, SKU, global_unique_id, price, sale_price, stock_quantity, stock_status, color, size
 * Parent data inherited: title, description, categories, brand, material, etc.
 * Special handling for weight/dimensions and images
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

  // Create merged product object
  const merged = {
    id: variation.id,
    parent_id: parent.id,
    name: parent.name, // Keep parent title as-is
    description: parent.description || '', // Inherit from parent
    sku: variation.sku || '', // Variation's own SKU
    permalink: variation.permalink || parent.permalink, // Variation's own permalink
    price: variation.price || '', // Variation's own price
    regular_price: variation.regular_price || '',
    sale_price: variation.sale_price || '',
    date_on_sale_from: variation.date_on_sale_from || null,
    date_on_sale_to: variation.date_on_sale_to || null,
    stock_status: variation.stock_status || '', // Variation's own stock status
    stock_quantity: variation.stock_quantity !== null ? variation.stock_quantity : null,
    manage_stock: variation.manage_stock || false,
    weight: weight || '',
    dimensions: dimensions,
    shipping_class: parent.shipping_class || '',
    shipping_class_id: parent.shipping_class_id || 0,
    images: mergedImages,
    attributes: variation.attributes || [],
    categories: parent.categories || [], // Inherit from parent
    tags: parent.tags || [], // Inherit from parent
    meta_data: variation.meta_data || [],
    date_modified: variation.date_modified || parent.date_modified,
    // Store variation-specific attributes for color/size extraction
    _variation_color: varAttrs.color || varAttrs.colour || '',
    _variation_size: varAttrs.size || '',
  };

  return transformWooProduct(merged, shopCurrency);
}
