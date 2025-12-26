import { Request, Response } from 'express';
import { z } from 'zod';
import { ProductStatus, SyncStatus, Prisma } from '@prisma/client';
import {
  ProductFieldOverrides,
  LOCKED_FIELD_SET,
  STATIC_OVERRIDE_ALLOWED_LOCKED_FIELDS,
  validateStaticValue,
  OPENAI_FEED_SPEC,
  isProductEditable,
} from '@productsynch/shared';
import { getProduct as getProductRecord, listProducts as listProductsForShop, updateProduct as updateProductRecord, getFilteredProductIds, getColumnValues as getColumnValuesService, ListProductsOptions } from '../services/productService';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { reprocessProduct } from '../services/productReprocessService';
import { JwtUser } from '../middleware/auth';

function userIdFromReq(req: Request): string {
  const user = (req as Request & { user?: JwtUser }).user;
  return user?.sub || '';
}

const updateProductSchema = z.object({
  status: z.nativeEnum(ProductStatus).optional(),
  syncStatus: z.nativeEnum(SyncStatus).optional(),
  manualTitle: z.string().optional(),
  manualDescription: z.string().optional(),
  feedEnableSearch: z.boolean().optional(),
  // feedEnableCheckout is not allowed - it's always false (feature not yet available)
});

// ═══════════════════════════════════════════════════════════════════════════
// BULK UPDATE SCHEMA AND TYPES
// ═══════════════════════════════════════════════════════════════════════════

const columnFilterSchema = z.object({
  text: z.string().optional(),
  values: z.array(z.string()).optional(),
});

const bulkUpdateFilterSchema = z.object({
  search: z.string().optional(),
  columnFilters: z.record(columnFilterSchema).optional(),
});

const bulkUpdateOperationSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('enable_search'), value: z.boolean() }),
  z.object({
    type: z.literal('field_mapping'),
    attribute: z.string(),
    wooField: z.string().nullable(),
  }),
  z.object({
    type: z.literal('static_override'),
    attribute: z.string(),
    value: z.string(),
  }),
  z.object({
    type: z.literal('remove_override'),
    attribute: z.string(),
  }),
]);

const bulkUpdateSchema = z.object({
  selectionMode: z.enum(['selected', 'filtered']),
  productIds: z.array(z.string()).optional(),
  filters: bulkUpdateFilterSchema.optional(),
  update: bulkUpdateOperationSchema,
}).refine((data) => {
  if (data.selectionMode === 'selected') {
    return data.productIds && data.productIds.length > 0;
  }
  return true;
}, { message: 'productIds required when selectionMode is "selected"' });

type BulkUpdateOperation = z.infer<typeof bulkUpdateOperationSchema>;

/**
 * Parse column filters from query parameters
 * Format: cf_{columnId}_t for text, cf_{columnId}_v for values (comma-separated)
 */
function parseColumnFilters(query: Record<string, unknown>): Record<string, { text?: string; values?: string[] }> | undefined {
  const columnFilters: Record<string, { text?: string; values?: string[] }> = {};
  const CF_PREFIX = 'cf_';
  const CF_TEXT_SUFFIX = '_t';
  const CF_VALUES_SUFFIX = '_v';

  for (const [key, value] of Object.entries(query)) {
    if (!key.startsWith(CF_PREFIX) || typeof value !== 'string') continue;

    const withoutPrefix = key.slice(CF_PREFIX.length);

    if (withoutPrefix.endsWith(CF_TEXT_SUFFIX)) {
      const columnId = withoutPrefix.slice(0, -CF_TEXT_SUFFIX.length);
      if (!columnFilters[columnId]) columnFilters[columnId] = {};
      columnFilters[columnId].text = value;
    } else if (withoutPrefix.endsWith(CF_VALUES_SUFFIX)) {
      const columnId = withoutPrefix.slice(0, -CF_VALUES_SUFFIX.length);
      if (!columnFilters[columnId]) columnFilters[columnId] = {};
      columnFilters[columnId].values = value.split(',').filter(Boolean);
    }
  }

  return Object.keys(columnFilters).length > 0 ? columnFilters : undefined;
}

export function listProducts(req: Request, res: Response) {
  const { id } = req.params;

  // Parse column filters from query params (cf_columnId_t, cf_columnId_v)
  const columnFilters = parseColumnFilters(req.query as Record<string, unknown>);

  // Parse query parameters for filtering and sorting
  const options: ListProductsOptions = {
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 20),
    sortBy: (req.query.sortBy as ListProductsOptions['sortBy']) || 'updatedAt',
    sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    search: req.query.search as string | undefined,
    columnFilters,
  };

  listProductsForShop(id, options)
    .then((result) => {
      logger.info('Products list retrieved successfully', {
        shopId: id,
        page: options.page,
        limit: options.limit,
        count: result.products.length,
        total: result.pagination.total,
        filters: {
          search: options.search,
          columnFilters: options.columnFilters,
        },
      });
      res.json(result);
    })
    .catch((err) => {
      logger.error('Failed to list products', {
        error: err,
        shopId: id,
        options,
        userId: userIdFromReq(req),
      });
      return res.status(500).json({ error: err.message });
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
        status: product.status
      });
      return res.json({ product });
    })
    .catch((err) => {
      logger.error('Failed to get product', {
        error: err,
        shopId: id,
        productId: pid,
        userId: userIdFromReq(req),
      });
      return res.status(500).json({ error: err.message });
    });
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
        userId: userIdFromReq(req),
      });
      return res.json({ product });
    })
    .catch((err) => {
      logger.error('Failed to update product', {
        error: err,
        shopId: id,
        productId: pid,
        updateData: parse.data,
        userId: userIdFromReq(req),
      });
      return res.status(500).json({ error: err.message });
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// BULK UPDATE ENDPOINT
// ═══════════════════════════════════════════════════════════════════════════

const BULK_UPDATE_CHUNK_SIZE = 100;

/**
 * Apply a single bulk update operation to a product
 */
async function applyBulkUpdateToProduct(
  productId: string,
  update: BulkUpdateOperation
): Promise<void> {
  switch (update.type) {
    case 'enable_search': {
      // Update feedEnableSearch column
      await prisma.product.update({
        where: { id: productId },
        data: { feedEnableSearch: update.value, updatedAt: new Date() },
      });

      // Reprocess to update openaiAutoFilled.enable_search for catalog display
      await reprocessProduct(productId);
      break;
    }

    case 'field_mapping': {
      // Validate: mapping not allowed for locked fields
      if (LOCKED_FIELD_SET.has(update.attribute)) {
        throw new Error(`Custom mapping not allowed for locked field: ${update.attribute}`);
      }

      // Get current overrides and merge
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { productFieldOverrides: true },
      });

      const overrides = (product?.productFieldOverrides as unknown as ProductFieldOverrides) || {};
      overrides[update.attribute] = {
        type: 'mapping',
        value: update.wooField,
      };

      await prisma.product.update({
        where: { id: productId },
        data: { productFieldOverrides: overrides as unknown as Prisma.InputJsonValue, updatedAt: new Date() },
      });

      // Reprocess to update openaiAutoFilled
      await reprocessProduct(productId);
      break;
    }

    case 'static_override': {
      // Validate: static override allowed if not locked OR in STATIC_OVERRIDE_ALLOWED_LOCKED_FIELDS
      const isLockedField = LOCKED_FIELD_SET.has(update.attribute);
      const allowsStaticOverride = STATIC_OVERRIDE_ALLOWED_LOCKED_FIELDS.has(update.attribute);

      if (isLockedField && !allowsStaticOverride) {
        throw new Error(`Static override not allowed for locked field: ${update.attribute}`);
      }

      // Validate the static value
      const validation = validateStaticValue(update.attribute, update.value);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid value');
      }

      // Get current overrides and merge
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { productFieldOverrides: true },
      });

      const overrides = (product?.productFieldOverrides as unknown as ProductFieldOverrides) || {};
      overrides[update.attribute] = {
        type: 'static',
        value: update.value,
      };

      await prisma.product.update({
        where: { id: productId },
        data: { productFieldOverrides: overrides as unknown as Prisma.InputJsonValue, updatedAt: new Date() },
      });

      // Reprocess to update openaiAutoFilled
      await reprocessProduct(productId);
      break;
    }

    case 'remove_override': {
      // Get current overrides
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { productFieldOverrides: true },
      });

      const overrides = (product?.productFieldOverrides as unknown as ProductFieldOverrides) || {};

      if (overrides[update.attribute]) {
        delete overrides[update.attribute];

        await prisma.product.update({
          where: { id: productId },
          data: { productFieldOverrides: overrides as unknown as Prisma.InputJsonValue, updatedAt: new Date() },
        });

        // Reprocess to update openaiAutoFilled
        await reprocessProduct(productId);
      }
      break;
    }
  }
}

/**
 * POST /shops/:id/products/bulk-update
 * Bulk update products with chunked processing
 */
export async function bulkUpdate(req: Request, res: Response) {
  const { id: shopId } = req.params;

  const parse = bulkUpdateSchema.safeParse(req.body);
  if (!parse.success) {
    logger.warn('products:bulk-update invalid request', {
      shopId,
      validationErrors: parse.error.flatten(),
    });
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { selectionMode, productIds: selectedIds, filters, update } = parse.data;

  try {
    // Pre-validate update operation before processing any products
    // Skip editability check for enable_search (handled by toolbar, always allowed)
    if (update.type !== 'enable_search') {
      const spec = OPENAI_FEED_SPEC.find(s => s.attribute === update.attribute);
      if (spec && !isProductEditable(spec)) {
        const reason = spec.isFeatureDisabled ? 'feature not yet available'
          : spec.isAutoPopulated ? 'auto-populated from other fields'
          : spec.isShopManaged ? 'managed at shop level'
          : 'not editable at product level';
        return res.status(400).json({
          error: `Field "${update.attribute}" cannot be edited: ${reason}`,
        });
      }
    }

    if (update.type === 'field_mapping' && LOCKED_FIELD_SET.has(update.attribute)) {
      return res.status(400).json({
        error: `Custom mapping not allowed for locked field: ${update.attribute}`,
      });
    }

    if (update.type === 'static_override') {
      const isLockedField = LOCKED_FIELD_SET.has(update.attribute);
      const allowsStaticOverride = STATIC_OVERRIDE_ALLOWED_LOCKED_FIELDS.has(update.attribute);

      if (isLockedField && !allowsStaticOverride) {
        return res.status(400).json({
          error: `Static override not allowed for locked field: ${update.attribute}`,
        });
      }

      const validation = validateStaticValue(update.attribute, update.value);
      if (!validation.isValid) {
        return res.status(400).json({
          error: validation.error || 'Invalid static value',
        });
      }
    }

    // Resolve product IDs based on selection mode
    let productIdsToUpdate: string[];

    if (selectionMode === 'selected') {
      productIdsToUpdate = selectedIds!;
    } else {
      // Filtered mode: get all products matching filters
      productIdsToUpdate = await getFilteredProductIds(shopId, filters || {});
    }

    if (productIdsToUpdate.length === 0) {
      return res.status(400).json({
        error: 'No products match the selection criteria',
      });
    }

    logger.info('products:bulk-update starting', {
      shopId,
      selectionMode,
      totalProducts: productIdsToUpdate.length,
      updateType: update.type,
      userId: userIdFromReq(req),
    });

    // Process in chunks
    const errors: Array<{ productId: string; error: string }> = [];
    let processedCount = 0;

    for (let i = 0; i < productIdsToUpdate.length; i += BULK_UPDATE_CHUNK_SIZE) {
      const chunk = productIdsToUpdate.slice(i, i + BULK_UPDATE_CHUNK_SIZE);

      // Process chunk in parallel - wrap each in try/catch to preserve productId on error
      const results = await Promise.all(
        chunk.map(async (productId) => {
          try {
            await applyBulkUpdateToProduct(productId, update);
            return { productId, success: true as const };
          } catch (err) {
            return {
              productId,
              success: false as const,
              error: err instanceof Error ? err.message : 'Unknown error',
            };
          }
        })
      );

      // Collect results
      for (const result of results) {
        if (result.success) {
          processedCount++;
        } else {
          errors.push({ productId: result.productId, error: result.error });
        }
      }
    }

    logger.info('products:bulk-update completed', {
      shopId,
      totalProducts: productIdsToUpdate.length,
      processedProducts: processedCount,
      failedProducts: errors.length,
      updateType: update.type,
      userId: userIdFromReq(req),
    });

    res.json({
      success: errors.length === 0,
      totalProducts: productIdsToUpdate.length,
      processedProducts: processedCount,
      failedProducts: errors.length,
      errors: errors.slice(0, 100), // Limit errors in response
      completed: true,
    });
  } catch (err) {
    logger.error('products:bulk-update error', {
      error: err instanceof Error ? err : new Error(String(err)),
      shopId,
      selectionMode,
      updateType: update.type,
      userId: userIdFromReq(req),
    });
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Bulk update failed',
    });
  }
}

/**
 * GET /shops/:id/products/column-values
 * Get unique values for a column to populate filter dropdown.
 * Supports cascading filters: pass current filters to get contextual values.
 */
export async function getColumnValues(req: Request, res: Response) {
  const { id: shopId } = req.params;
  const column = req.query.column as string;
  const limit = Number(req.query.limit) || 100;
  const search = req.query.search as string | undefined;

  if (!column) {
    return res.status(400).json({ error: 'column query parameter is required' });
  }

  // Parse current filters for cascading filter support
  const columnFilters = parseColumnFilters(req.query as Record<string, unknown>);
  const currentFilters: ListProductsOptions | undefined = columnFilters
    ? {
        search: req.query.globalSearch as string | undefined,
        columnFilters,
      }
    : req.query.globalSearch
      ? { search: req.query.globalSearch as string }
      : undefined;

  try {
    const result = await getColumnValuesService(shopId, column, limit, search, currentFilters);

    logger.info('Column values retrieved', {
      shopId,
      column,
      valueCount: result.values.length,
      totalDistinct: result.totalDistinct,
      hasCascadingFilters: !!currentFilters,
    });

    res.json(result);
  } catch (err) {
    logger.error('Failed to get column values', {
      error: err instanceof Error ? err : new Error(String(err)),
      shopId,
      column,
      userId: userIdFromReq(req),
    });
    res.status(500).json({ error: 'Failed to fetch column values' });
  }
}

/**
 * Get product WooCommerce raw data for field mapping preview
 */
export async function getProductWooData(req: Request, res: Response) {
  const { id: shopId, pid: productId } = req.params;

  try {
    // Fetch product with WooCommerce raw JSON
    const product = await prisma.product.findFirst({
      where: { shopId, id: productId },
      select: { wooRawJson: true },
    });

    if (!product) {
      logger.warn('Product not found for WooCommerce data', { shopId, productId });
      return res.status(404).json({ error: 'Product not found' });
    }

    // Fetch shop data for units and currency
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        id: true,
        shopCurrency: true,
        dimensionUnit: true,
        weightUnit: true,
        sellerName: true,
        sellerUrl: true,
        sellerPrivacyPolicy: true,
        sellerTos: true,
        returnPolicy: true,
        returnWindow: true,
      },
    });

    logger.info('Product WooCommerce data fetched successfully', {
      shopId,
      productId,
      wooProductId: (product.wooRawJson as any)?.id,
    });

    res.json({
      wooData: product.wooRawJson,
      shopData: shop,
    });
  } catch (err) {
    logger.error('Failed to get product WooCommerce data', {
      error: err instanceof Error ? err : new Error(String(err)),
      shopId,
      productId,
      userId: userIdFromReq(req),
    });
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch product data' });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCT FIELD OVERRIDE ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

const productOverrideSchema = z.object({
  type: z.enum(['mapping', 'static']),
  value: z.string().nullable(),  // null for mapping type means "no mapping" (exclude field)
});

const updateOverridesSchema = z.object({
  overrides: z.record(z.string(), productOverrideSchema),
});

/**
 * GET /shops/:shopId/products/:productId/field-overrides
 * Get product field overrides along with resolved values
 */
export async function getProductFieldOverrides(req: Request, res: Response) {
  const { id: shopId, pid: productId } = req.params;

  try {
    const product = await prisma.product.findFirst({
      where: { shopId, id: productId },
      select: {
        id: true,
        wooTitle: true,
        productFieldOverrides: true,
        openaiAutoFilled: true,
        feedEnableSearch: true,
        feedEnableCheckout: true,
        isValid: true,
        validationErrors: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get shop-level mappings for reference
    const fieldMappings = await prisma.fieldMapping.findMany({
      where: { shopId },
      include: {
        openaiField: true,
        wooField: true,
      },
    });

    const shopMappings: Record<string, string | null> = {};
    for (const mapping of fieldMappings) {
      shopMappings[mapping.openaiField.attribute] = mapping.wooField?.value || null;
    }

    const productOverrides = (product.productFieldOverrides as unknown as ProductFieldOverrides) || {};

    logger.info('Product field overrides retrieved', {
      shopId,
      productId,
      overrideCount: Object.keys(productOverrides).length,
    });

    // Use OpenAI title with fallback to wooTitle
    const openaiData = product.openaiAutoFilled as Record<string, unknown> | null;
    const productTitle = (openaiData?.title as string) || product.wooTitle;

    res.json({
      productId: product.id,
      productTitle,
      overrides: productOverrides,
      shopMappings,
      resolvedValues: product.openaiAutoFilled || {},
      feedEnableSearch: product.feedEnableSearch,
      feedEnableCheckout: product.feedEnableCheckout,
      isValid: product.isValid,
      validationErrors: product.validationErrors,
    });
  } catch (err) {
    logger.error('Failed to get product field overrides', {
      error: err instanceof Error ? err : new Error(String(err)),
      shopId,
      productId,
    });
    res.status(500).json({ error: 'Failed to fetch field overrides' });
  }
}

/**
 * PUT /shops/:shopId/products/:productId/field-overrides
 * Update product field overrides
 */
export async function updateProductFieldOverrides(req: Request, res: Response) {
  const { id: shopId, pid: productId } = req.params;

  const parse = updateOverridesSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { overrides } = parse.data;

  try {
    // Verify product exists
    const product = await prisma.product.findFirst({
      where: { shopId, id: productId },
      select: { id: true },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Validate each override
    const validationErrors: Record<string, string> = {};

    for (const [attribute, override] of Object.entries(overrides)) {
      // Check if field is editable at product level (skip for enable_search which has special handling)
      if (attribute !== 'enable_search') {
        const spec = OPENAI_FEED_SPEC.find(s => s.attribute === attribute);
        if (spec && !isProductEditable(spec)) {
          const reason = spec.isFeatureDisabled ? 'feature not yet available'
            : spec.isAutoPopulated ? 'auto-populated from other fields'
            : spec.isShopManaged ? 'managed at shop level'
            : 'not editable at product level';
          validationErrors[attribute] = `Cannot edit: ${reason}`;
          continue;
        }
      }

      const isLockedField = LOCKED_FIELD_SET.has(attribute);
      const allowsStaticOverride = STATIC_OVERRIDE_ALLOWED_LOCKED_FIELDS.has(attribute);

      // Check if field allows this type of override
      if (override.type === 'mapping' && isLockedField) {
        validationErrors[attribute] = 'Custom mapping not allowed for locked fields';
        continue;
      }

      if (override.type === 'static' && isLockedField && !allowsStaticOverride) {
        validationErrors[attribute] = 'Static value not allowed for this locked field';
        continue;
      }

      // Validate static values (null not allowed for static type)
      if (override.type === 'static') {
        if (override.value === null) {
          validationErrors[attribute] = 'Static value cannot be null';
          continue;
        }
        const validation = validateStaticValue(attribute, override.value);
        if (!validation.isValid) {
          validationErrors[attribute] = validation.error || 'Invalid value';
        }
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        validationErrors,
      });
    }

    // Update product overrides
    await prisma.product.update({
      where: { id: productId },
      data: {
        productFieldOverrides: overrides,
      },
    });

    // Reprocess product to update openaiAutoFilled
    await reprocessProduct(productId);

    // Fetch updated product
    const updatedProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        productFieldOverrides: true,
        openaiAutoFilled: true,
        isValid: true,
        validationErrors: true,
      },
    });

    logger.info('Product field overrides updated', {
      shopId,
      productId,
      overrideCount: Object.keys(overrides).length,
    });

    res.json({
      success: true,
      overrides: updatedProduct?.productFieldOverrides || {},
      resolvedValues: updatedProduct?.openaiAutoFilled || {},
      isValid: updatedProduct?.isValid,
      validationErrors: updatedProduct?.validationErrors,
    });
  } catch (err) {
    logger.error('Failed to update product field overrides', {
      error: err instanceof Error ? err : new Error(String(err)),
      shopId,
      productId,
    });
    res.status(500).json({ error: 'Failed to update field overrides' });
  }
}

/**
 * DELETE /shops/:shopId/products/:productId/field-overrides/:attribute
 * Reset a single field to shop default
 */
export async function deleteProductFieldOverride(req: Request, res: Response) {
  const { id: shopId, pid: productId, attribute } = req.params;

  try {
    // Verify product exists
    const product = await prisma.product.findFirst({
      where: { shopId, id: productId },
      select: {
        id: true,
        productFieldOverrides: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const overrides = (product.productFieldOverrides as unknown as ProductFieldOverrides) || {};

    if (!overrides[attribute]) {
      return res.status(404).json({ error: 'No override found for this field' });
    }

    // Remove the override
    delete overrides[attribute];

    await prisma.product.update({
      where: { id: productId },
      data: {
        productFieldOverrides: overrides as any,
      },
    });

    // Reprocess product
    await reprocessProduct(productId);

    // Fetch updated product
    const updatedProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        productFieldOverrides: true,
        openaiAutoFilled: true,
      },
    });

    logger.info('Product field override deleted', {
      shopId,
      productId,
      attribute,
    });

    res.json({
      success: true,
      overrides: updatedProduct?.productFieldOverrides || {},
      resolvedValues: updatedProduct?.openaiAutoFilled || {},
    });
  } catch (err) {
    logger.error('Failed to delete product field override', {
      error: err instanceof Error ? err : new Error(String(err)),
      shopId,
      productId,
      attribute,
    });
    res.status(500).json({ error: 'Failed to delete field override' });
  }
}

