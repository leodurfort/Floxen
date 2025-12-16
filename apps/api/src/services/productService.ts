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

  // Create merged product object
  const merged = {
    id: variation.id,
    parent_id: parent.id,
    name: parent.name, // Keep parent title as-is
    description: parent.description || '', // Inherit from parent
    sku: variation.sku || '', // Variation's own SKU
    permalink: variation.permalink || parent.permalink, // Variation's own permalink
    price: price, // Variation price or parent fallback
    regular_price: regularPrice,
    sale_price: salePrice,
    date_on_sale_from: variation.date_on_sale_from || parent.date_on_sale_from || null,
    date_on_sale_to: variation.date_on_sale_to || parent.date_on_sale_to || null,
    stock_status: variation.stock_status || '', // Variation's own stock status
    stock_quantity: variation.stock_quantity !== null ? variation.stock_quantity : null,
    manage_stock: variation.manage_stock || parent.manage_stock || false,
    weight: weight || '',
    dimensions: dimensions,
    shipping_class: parent.shipping_class || '',
    shipping_class_id: parent.shipping_class_id || 0,
    images: mergedImages,
    attributes: mergedAttributes, // Merged attributes including color/size
    categories: parent.categories || [], // Inherit from parent
    tags: parent.tags || [], // Inherit from parent
    brands: parent.brands || [], // Inherit brand from parent
    meta_data: [...(parent.meta_data || []), ...(variation.meta_data || [])], // Merge meta_data
    date_modified: variation.date_modified || parent.date_modified,
  };

  return transformWooProduct(merged, shopCurrency);
}
