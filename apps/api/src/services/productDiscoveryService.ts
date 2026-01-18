import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { createWooClient, fetchAllProducts } from './wooClient';
import { getTierLimit, isUnlimitedTier, type SubscriptionTier } from '../config/billing';

/**
 * Discovered product metadata (minimal data for selection UI)
 */
export interface DiscoveredProduct {
  id: string;
  wooProductId: number;
  wooTitle: string;
  wooPrice: string | null;
  wooImages: { src: string }[] | null;
  productType: string; // 'simple' | 'variable'
  isSelected: boolean;
  syncState: string;
}

/**
 * Fetch WooCommerce products (parent products only) and store as discovered
 * This is a lightweight fetch that only stores metadata for selection UI
 */
export async function discoverWooCommerceProducts(shopId: string): Promise<{
  discovered: number;
  total: number;
}> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    include: { user: true },
  });

  if (!shop) {
    throw new Error('Shop not found');
  }

  if (!shop.wooConsumerKey || !shop.wooConsumerSecret) {
    throw new Error('WooCommerce credentials not configured');
  }

  const client = createWooClient({
    storeUrl: shop.wooStoreUrl,
    consumerKey: shop.wooConsumerKey,
    consumerSecret: shop.wooConsumerSecret,
  });

  logger.info('product-discovery: fetching products from WooCommerce', { shopId });

  // Fetch all products from WooCommerce
  const wooProducts = await fetchAllProducts(client);

  // Filter to parent products only (exclude variations)
  // Variations have a parent_id set
  const parentProducts = wooProducts.filter((p: any) => !p.parent_id || p.parent_id === 0);

  logger.info('product-discovery: filtered to parent products', {
    shopId,
    total: wooProducts.length,
    parents: parentProducts.length,
    variations: wooProducts.length - parentProducts.length,
  });

  // Upsert each product with minimal data
  let discoveredCount = 0;
  for (const wooProd of parentProducts) {
    // Check if product already exists
    const existing = await prisma.product.findUnique({
      where: { shopId_wooProductId: { shopId, wooProductId: wooProd.id } },
      select: { id: true, syncState: true, isSelected: true },
    });

    if (existing) {
      // Product already exists, skip
      logger.debug('product-discovery: product already exists', {
        shopId,
        wooProductId: wooProd.id,
        syncState: existing.syncState,
      });
      continue;
    }

    // Create new discovered product with minimal data
    // Use shop's defaultEnableSearch setting so products are ready when synced
    await prisma.product.create({
      data: {
        shopId,
        wooProductId: wooProd.id,
        wooTitle: wooProd.name || 'Untitled',
        wooPrice: wooProd.price ? String(wooProd.price) : null,
        wooImages: wooProd.images || [],
        wooRawJson: { type: wooProd.type }, // Store type for UI
        isSelected: false,
        syncState: 'discovered',
        isValid: false, // Not validated yet
        openaiAutoFilled: {},
        feedEnableSearch: shop.defaultEnableSearch, // Use shop default so products are ready when synced
      },
    });

    discoveredCount++;
  }

  logger.info('product-discovery: completed', {
    shopId,
    discovered: discoveredCount,
    total: parentProducts.length,
  });

  return {
    discovered: discoveredCount,
    total: parentProducts.length,
  };
}

/**
 * Get discovered products for a shop (for selection UI)
 * Returns parent products only, sorted by title
 * Supports pagination for better performance
 */
export async function getDiscoveredProducts(
  shopId: string,
  options: { page?: number; pageSize?: number; search?: string } = {}
): Promise<{
  products: DiscoveredProduct[];
  total: number;
  selected: number;
  limit: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}> {
  const { page = 1, pageSize = 48, search } = options;

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    include: { user: true },
  });

  if (!shop) {
    throw new Error('Shop not found');
  }

  const tier = shop.user.subscriptionTier as SubscriptionTier;
  const limit = getTierLimit(tier);

  const whereClause = {
    shopId,
    wooParentId: null,
    ...(search && {
      wooTitle: { contains: search, mode: 'insensitive' as const },
    }),
  };

  // Get total count and selected count
  const [total, selected] = await Promise.all([
    prisma.product.count({ where: whereClause }),
    prisma.product.count({ where: { ...whereClause, isSelected: true } }),
  ]);

  // Get paginated products
  const products = await prisma.product.findMany({
    where: whereClause,
    select: {
      id: true,
      wooProductId: true,
      wooTitle: true,
      wooPrice: true,
      wooImages: true,
      wooRawJson: true,
      isSelected: true,
      syncState: true,
    },
    orderBy: { wooTitle: 'asc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    products: products.map(p => ({
      id: p.id,
      wooProductId: p.wooProductId,
      wooTitle: p.wooTitle,
      wooPrice: p.wooPrice?.toString() ?? null,
      wooImages: p.wooImages as { src: string }[] | null,
      productType: (p.wooRawJson as any)?.type || 'simple',
      isSelected: p.isSelected,
      syncState: p.syncState,
    })),
    total,
    selected,
    limit,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  };
}

/**
 * Get filtered product IDs for bulk selection
 * Returns product IDs matching search criteria, up to tier limit
 */
export async function getFilteredProductIds(
  shopId: string,
  search?: string
): Promise<{ ids: string[]; limit: number }> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    include: { user: true },
  });

  if (!shop) {
    throw new Error('Shop not found');
  }

  const tier = shop.user.subscriptionTier as SubscriptionTier;
  const limit = getTierLimit(tier);

  const products = await prisma.product.findMany({
    where: {
      shopId,
      wooParentId: null,
      ...(search && {
        wooTitle: { contains: search, mode: 'insensitive' as const },
      }),
    },
    select: { id: true },
    orderBy: { wooTitle: 'asc' },
    take: limit,
  });

  return { ids: products.map(p => p.id), limit };
}

/**
 * Update product selection for a shop
 * Validates that selection count doesn't exceed tier limit
 */
export async function updateProductSelection(
  shopId: string,
  selectedProductIds: string[]
): Promise<{
  success: boolean;
  selected: number;
  limit: number;
  message: string;
}> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    include: { user: true },
  });

  if (!shop) {
    throw new Error('Shop not found');
  }

  const tier = shop.user.subscriptionTier as SubscriptionTier;
  const limit = getTierLimit(tier);

  // PRO tier has no limit
  if (!isUnlimitedTier(tier) && selectedProductIds.length > limit) {
    throw new Error(`Selection exceeds tier limit. Maximum ${limit} products allowed for ${tier} tier.`);
  }

  // Get all parent products for this shop
  const allProducts = await prisma.product.findMany({
    where: {
      shopId,
      wooParentId: null, // Only parent products
    },
    select: { id: true },
  });

  const allProductIds = new Set(allProducts.map(p => p.id));
  const selectedSet = new Set(selectedProductIds);

  // Validate that all selected IDs belong to this shop
  for (const id of selectedProductIds) {
    if (!allProductIds.has(id)) {
      throw new Error(`Product ${id} does not belong to this shop`);
    }
  }

  // Update selection in a transaction
  await prisma.$transaction(async (tx) => {
    // Deselect all products first
    await tx.product.updateMany({
      where: { shopId, wooParentId: null },
      data: { isSelected: false },
    });

    // Select the specified products
    if (selectedProductIds.length > 0) {
      await tx.product.updateMany({
        where: {
          id: { in: selectedProductIds },
          shopId,
        },
        data: { isSelected: true },
      });
    }

    // Clear the re-selection flag if it was set
    await tx.shop.update({
      where: { id: shopId },
      data: { needsProductReselection: false },
    });
  });

  logger.info('product-selection: updated', {
    shopId,
    selected: selectedProductIds.length,
    limit,
  });

  return {
    success: true,
    selected: selectedProductIds.length,
    limit,
    message: `Successfully selected ${selectedProductIds.length} products`,
  };
}

/**
 * Auto-select all products for PRO tier users
 */
export async function autoSelectAllProducts(shopId: string): Promise<number> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    include: { user: true },
  });

  if (!shop) {
    throw new Error('Shop not found');
  }

  const tier = shop.user.subscriptionTier as SubscriptionTier;

  if (!isUnlimitedTier(tier)) {
    throw new Error('Auto-select all is only available for PRO tier');
  }

  // Select all parent products
  const result = await prisma.product.updateMany({
    where: {
      shopId,
      wooParentId: null,
    },
    data: { isSelected: true },
  });

  logger.info('product-selection: auto-selected all for PRO tier', {
    shopId,
    count: result.count,
  });

  return result.count;
}
