import { Request, Response } from 'express';
import { z } from 'zod';
import { ProductStatus, SyncStatus } from '@prisma/client';
import { buildFeedPreview, getProduct as getProductRecord, listProducts as listProductsForShop, markEnrichmentQueued, updateProduct as updateProductRecord } from '../services/productService';
import { aiEnrichmentQueue, productSyncQueue } from '../jobs';
import { logger } from '../lib/logger';
import { FeedValueResolver } from '../services/feedValueResolver';

const updateProductSchema = z.object({
  status: z.nativeEnum(ProductStatus).optional(),
  syncStatus: z.nativeEnum(SyncStatus).optional(),
  manualTitle: z.string().optional(),
  manualDescription: z.string().optional(),
  feedEnableSearch: z.boolean().optional(),
  feedEnableCheckout: z.boolean().optional(),
});

const bulkActionSchema = z.object({
  action: z.enum(['enable_search', 'disable_search', 'sync', 'enrich']).default('sync'),
  productIds: z.array(z.string()).min(1),
});

// Schema for updating manual fields
const updateManualFieldSchema = z.object({
  field: z.enum(['title', 'description', 'category', 'keywords', 'q_and_a']),
  value: z.union([
    z.string().max(5000),  // For title, description, category
    z.array(z.string()).max(10),  // For keywords
    z.array(z.object({ q: z.string(), a: z.string() })).min(3).max(5),  // For q_and_a
  ]),
});

// Schema for updating selected source
const updateSelectedSourceSchema = z.object({
  field: z.enum(['title', 'description', 'category', 'keywords', 'q_and_a']),
  source: z.enum(['manual', 'ai']),
});

// Schema for updating any OpenAI field in the openaiEdited JSON
const updateOpenAIFieldSchema = z.object({
  field: z.string(),
  value: z.any(),
});

export function listProducts(req: Request, res: Response) {
  const { id } = req.params;
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  listProductsForShop(id, page, limit)
    .then((result) => {
      logger.info('Products list retrieved successfully', {
        shopId: id,
        page,
        limit,
        count: result.products.length,
        total: result.pagination.total
      });
      res.json(result);
    })
    .catch((err) => {
      logger.error('Failed to list products', {
        error: err,
        shopId: id,
        page,
        limit,
        userId: (req as any).user?.id,
      });
      res.status(500).json({ error: err.message });
    });
}

export function getProduct(req: Request, res: Response) {
  const { id, pid } = req.params;
  getProductRecord(id, pid)
    .then((product) => {
      if (!product) {
        logger.warn('Product not found', { shopId: id, productId: pid });
        return res.status(404).json({ error: 'Product not found' });
      }
      logger.info('Product retrieved successfully', {
        shopId: id,
        productId: pid,
        status: product.status,
        aiEnriched: product.aiEnriched
      });
      return res.json({ product });
    })
    .catch((err) => {
      logger.error('Failed to get product', {
        error: err,
        shopId: id,
        productId: pid,
        userId: (req as any).user?.id,
      });
      res.status(500).json({ error: err.message });
    });
}

export async function getProductWooData(req: Request, res: Response) {
  const { id, pid } = req.params;

  try {
    // Import here to avoid circular dependencies
    const { getShop } = await import('../services/shopService');
    const { createWooClient, fetchSingleProduct } = await import('../services/wooClient');

    // Get the product to find wooProductId
    const product = await getProductRecord(id, pid);
    if (!product) {
      logger.warn('Product not found for woo data fetch', { shopId: id, productId: pid });
      return res.status(404).json({ error: 'Product not found' });
    }

    // Validate wooProductId exists
    if (!product.wooProductId) {
      logger.warn('Product missing wooProductId', {
        shopId: id,
        productId: pid,
        productData: {
          id: product.id,
          wooProductId: product.wooProductId,
          status: product.status,
        }
      });
      return res.status(400).json({ error: 'Product does not have a WooCommerce product ID' });
    }

    // Get the shop to create WooCommerce client
    const shop = await getShop(id);
    if (!shop || !shop.isConnected) {
      logger.warn('Shop not connected for woo data fetch', { shopId: id });
      return res.status(400).json({ error: 'Shop not connected to WooCommerce' });
    }

    // Log the WooCommerce request details
    logger.info('Fetching WooCommerce data', {
      shopId: id,
      productId: pid,
      wooProductId: product.wooProductId,
      storeUrl: shop.wooStoreUrl,
    });

    // Fetch fresh data from WooCommerce API
    const wooClient = createWooClient({
      storeUrl: shop.wooStoreUrl,
      consumerKey: shop.wooConsumerKey!,
      consumerSecret: shop.wooConsumerSecret!,
    });

    let wooData = await fetchSingleProduct(wooClient, product.wooProductId);

    // For variation products, use mergeParentAndVariation to properly merge all fields including attributes
    if (product.wooParentId) {
      const { mergeParentAndVariation } = await import('../services/productService');

      // Fetch parent product and merge
      const parentData = await fetchSingleProduct(wooClient, product.wooParentId);
      const mergedTransformed = mergeParentAndVariation(parentData, wooData, shop.shopCurrency || 'USD');

      // mergeParentAndVariation returns transformed data (wooAttributes),
      // but we need raw WooCommerce format (attributes) for the endpoint
      wooData = mergedTransformed.wooRawJson;

      logger.info('Merged variation with parent', {
        shopId: id,
        productId: pid,
        wooProductId: product.wooProductId,
        wooParentId: product.wooParentId,
      });
    }

    logger.info('Product WooCommerce data fetched successfully', {
      shopId: id,
      productId: pid,
      wooProductId: product.wooProductId,
    });

    // Normalize the data to match the database structure (wooAttributes, wooCategories, etc.)
    // This ensures the frontend only needs to look in one place
    const normalizedData = {
      ...wooData,
      wooAttributes: wooData.attributes || [],
      wooCategories: wooData.categories || [],
      wooImages: wooData.images || [],
      wooRawJson: wooData,
    };

    // Include shop data for previewing shop-level fields
    const shopData = {
      id: shop.id, // Required for transforms like generateGroupId
      sellerName: shop.sellerName,
      sellerUrl: shop.sellerUrl,
      sellerPrivacyPolicy: shop.sellerPrivacyPolicy,
      sellerTos: shop.sellerTos,
      returnPolicy: shop.returnPolicy,
      returnWindow: shop.returnWindow,
      shopCurrency: shop.shopCurrency,
    };

    logger.info('Sending shop data in response', {
      shopId: id,
      productId: pid,
      shopData,
      hasSellerName: !!shop.sellerName,
      hasSellerUrl: !!shop.sellerUrl,
    });

    return res.json({ wooData: normalizedData, shopData });
  } catch (err: any) {
    logger.error('Failed to fetch product WooCommerce data', {
      error: err instanceof Error ? err : new Error(String(err)),
      shopId: id,
      productId: pid,
    });
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch product data' });
  }
}

export function updateProduct(req: Request, res: Response) {
  const { id, pid } = req.params;
  const parse = updateProductSchema.safeParse(req.body);
  if (!parse.success) {
    logger.warn('Invalid product update request', {
      shopId: id,
      productId: pid,
      validationErrors: parse.error.flatten(),
      requestBody: req.body,
    });
    return res.status(400).json({ error: parse.error.flatten() });
  }
  updateProductRecord(id, pid, parse.data)
    .then((product) => {
      if (!product) {
        logger.warn('Product not found for update', { shopId: id, productId: pid });
        return res.status(404).json({ error: 'Product not found' });
      }
      logger.info('Product updated successfully', {
        shopId: id,
        productId: pid,
        updatedFields: Object.keys(parse.data),
        userId: (req as any).user?.id,
      });
      return res.json({ product });
    })
    .catch((err) => {
      logger.error('Failed to update product', {
        error: err,
        shopId: id,
        productId: pid,
        updateData: parse.data,
        userId: (req as any).user?.id,
      });
      res.status(500).json({ error: err.message });
    });
}

export function triggerEnrichment(req: Request, res: Response) {
  const { id, pid } = req.params;
  markEnrichmentQueued(id, pid)
    .then((product) => {
      if (!product) {
        logger.warn('Product not found for enrichment', { shopId: id, productId: pid });
        return res.status(404).json({ error: 'Product not found' });
      }
      aiEnrichmentQueue?.queue.add('ai-enrichment', { productId: product.id }, { removeOnComplete: true });
      logger.info('Product enrichment queued successfully', {
        shopId: id,
        productId: pid,
        userId: (req as any).user?.id,
      });
      return res.json({ product, message: 'Enrichment queued' });
    })
    .catch((err) => {
      logger.error('Failed to queue product enrichment', {
        error: err,
        shopId: id,
        productId: pid,
        userId: (req as any).user?.id,
      });
      res.status(500).json({ error: err.message });
    });
}

export function previewFeed(req: Request, res: Response) {
  const { id, pid } = req.params;
  getProductRecord(id, pid)
    .then((product) => {
      if (!product) return res.status(404).json({ error: 'Product not found' });
      return res.json({
        feed: buildFeedPreview(product, id),
      });
    })
    .catch((err) => res.status(500).json({ error: err.message }));
}

export function bulkAction(req: Request, res: Response) {
  const parse = bulkActionSchema.safeParse(req.body);
  if (!parse.success) {
    logger.warn('products:bulk invalid', parse.error.flatten());
    return res.status(400).json({ error: parse.error.flatten() });
  }
  const { action, productIds } = parse.data;
  Promise.all(
    productIds.map(async (pid) => {
      const updated = await updateProductRecord(req.params.id, pid, {
        feedEnableSearch: action === 'enable_search' ? true : action === 'disable_search' ? false : undefined,
        syncStatus: action === 'sync' ? 'PENDING' : undefined,
      });
      if (action === 'enrich' && updated) {
        aiEnrichmentQueue?.queue.add('ai-enrichment', { productId: pid }, { removeOnComplete: true });
      }
      if (action === 'sync' && updated) {
        productSyncQueue?.queue.add('product-sync', { shopId: req.params.id, productId: pid }, { removeOnComplete: true });
      }
      return { id: pid, updated: Boolean(updated) };
    }),
  )
    .then((results) => {
      logger.info('products:bulk', { shopId: req.params.id, action, count: results.length });
      res.json({ action, results });
    })
    .catch((err) => {
      logger.error('products:bulk error', err);
      res.status(500).json({ error: err.message });
    });
}

/**
 * Update a single manual field with validation
 */
export async function updateManualField(req: Request, res: Response) {
  const { id, pid } = req.params;
  const parse = updateManualFieldSchema.safeParse(req.body);

  if (!parse.success) {
    logger.warn('products:update-manual-field invalid', parse.error.flatten());
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { field, value } = parse.data;

  // Additional validation for specific fields
  if (field === 'title' && typeof value === 'string' && value.length > 150) {
    return res.status(400).json({ error: 'Title must be 150 characters or less' });
  }

  if (field === 'description' && typeof value === 'string' && value.length > 5000) {
    return res.status(400).json({ error: 'Description must be 5000 characters or less' });
  }

  try {
    const updateData: any = { manualEditedAt: new Date() };

    // Map field to the correct manual* column
    switch (field) {
      case 'title':
        updateData.manualTitle = value as string;
        break;
      case 'description':
        updateData.manualDescription = value as string;
        break;
      case 'category':
        updateData.manualCategory = value as string;
        break;
      case 'keywords':
        updateData.manualKeywords = value as string[];
        break;
      case 'q_and_a':
        updateData.manualQAndA = value as Array<{ q: string; a: string }>;
        break;
    }

    const product = await updateProductRecord(id, pid, updateData);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    logger.info('products:update-manual-field', { shopId: id, productId: pid, field });
    return res.json({ product });
  } catch (err: any) {
    logger.error('products:update-manual-field error', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Update selected source for a field
 */
export async function updateSelectedSource(req: Request, res: Response) {
  const { id, pid } = req.params;
  const parse = updateSelectedSourceSchema.safeParse(req.body);

  if (!parse.success) {
    logger.warn('products:update-selected-source invalid', parse.error.flatten());
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { field, source } = parse.data;

  try {
    const product = await getProductRecord(id, pid);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Get current selectedSources or initialize
    const currentSources = (product.selectedSources as any) || {};
    const updatedSources = { ...currentSources, [field]: source };

    const updated = await updateProductRecord(id, pid, {
      selectedSources: updatedSources as any,
    });

    logger.info('products:update-selected-source', { shopId: id, productId: pid, field, source });
    return res.json({ product: updated });
  } catch (err: any) {
    logger.error('products:update-selected-source error', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Get resolved values (what will appear in the feed)
 */
export async function getResolvedValues(req: Request, res: Response) {
  const { id, pid } = req.params;

  try {
    const product = await getProductRecord(id, pid);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const resolver = new FeedValueResolver(product);
    const resolved = resolver.resolveAll();

    logger.info('products:resolved-values', { shopId: id, productId: pid });
    return res.json({ resolved });
  } catch (err: any) {
    logger.error('products:resolved-values error', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Get product with 3-column data structure for enrichment UI
 * Returns: OpenAI spec reference, WooCommerce/Manual data, AI suggestions, resolved values
 */
export async function getProductEnrichmentData(req: Request, res: Response) {
  const { id, pid } = req.params;

  try {
    const product = await getProductRecord(id, pid);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Auto-filled values from WooCommerce
    const autoFilled = (product.openaiAutoFilled as Record<string, any>) || {};

    // User's manual edits
    const edited = (product.openaiEdited as Record<string, any>) || {};

    // AI enrichment (only 4 fields)
    const aiData = {
      title: product.aiTitle,
      description: product.aiDescription,
      category: product.aiSuggestedCategory,
      keywords: product.aiKeywords,
      q_and_a: product.aiQAndA,
    };

    // Current source selection
    const selectedSources = (product.selectedSources as any) || {};

    // Resolved values (what will appear in feed)
    const resolver = new FeedValueResolver(product);
    const resolved = resolver.resolveAll();

    // Validation result
    const validationErrors = (product.validationErrors as any) || {};

    logger.info('products:enrichment-data', { shopId: id, productId: pid });
    return res.json({
      product: {
        id: product.id,
        wooProductId: product.wooProductId,
        status: product.status,
        isValid: product.isValid,
        feedEnableSearch: product.feedEnableSearch,
        feedEnableCheckout: product.feedEnableCheckout,
      },
      autoFilled,      // Column 2: WooCommerce auto-filled data
      edited,          // Column 2: User's manual edits (override autoFilled)
      aiData,          // Column 3: AI suggestions
      selectedSources, // Which source user selected per field
      resolved,        // What will appear in feed
      validationErrors,
    });
  } catch (err: any) {
    logger.error('products:enrichment-data error', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * Update any OpenAI field in the openaiEdited JSON
 * Used for editing non-enrichable fields in Column 2
 */
export async function updateOpenAIField(req: Request, res: Response) {
  const { id, pid } = req.params;
  const parse = updateOpenAIFieldSchema.safeParse(req.body);

  if (!parse.success) {
    logger.warn('products:update-openai-field invalid', parse.error.flatten());
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { field, value } = parse.data;

  try {
    const product = await getProductRecord(id, pid);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Get current openaiEdited or initialize
    const currentEdited = (product.openaiEdited as any) || {};
    const updatedEdited = { ...currentEdited, [field]: value };

    const updated = await updateProductRecord(id, pid, {
      openaiEdited: updatedEdited as any,
    });

    logger.info('products:update-openai-field', { shopId: id, productId: pid, field });
    return res.json({ product: updated });
  } catch (err: any) {
    logger.error('products:update-openai-field error', err);
    res.status(500).json({ error: err.message });
  }
}
