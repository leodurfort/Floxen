import { prisma } from '../lib/prisma';
import { ProductStatus, SyncStatus } from '@prisma/client';

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
