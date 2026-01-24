import { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import {
  ProductFieldOverrides,
  LOCKED_FIELD_SET,
  STATIC_OVERRIDE_ALLOWED_LOCKED_FIELDS,
  validateStaticValue,
  OPENAI_FEED_SPEC,
  isProductEditable,
} from '@floxen/shared';
import { listProducts as listProductsForShop, updateProduct as updateProductRecord, getFilteredProductIds, getColumnValues as getColumnValuesService, ListProductsOptions, countProductsByItemGroupId, getProductIdsByItemGroupId } from '../services/productService';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { reprocessProduct } from '../services/productReprocessService';
import { getUserId, toError } from '../utils/request';

// Helper to get product overrides with type safety
function getProductOverrides(product: { productFieldOverrides: unknown } | null): ProductFieldOverrides {
  return (product?.productFieldOverrides as unknown as ProductFieldOverrides) || {};
}

// Helper to update enable_search override marker based on shop default
async function updateEnableSearchOverride(
  productId: string,
  shopId: string,
  newValue: boolean
): Promise<void> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { defaultEnableSearch: true },
  });

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { productFieldOverrides: true },
  });

  const overrides = getProductOverrides(product);
  const isCustomized = newValue !== shop?.defaultEnableSearch;

  if (isCustomized) {
    overrides['enable_search'] = { type: 'static', value: newValue ? 'true' : 'false' };
  } else {
    delete overrides['enable_search'];
  }

  await prisma.product.update({
    where: { id: productId },
    data: { productFieldOverrides: overrides as unknown as Prisma.InputJsonValue },
  });
}

// Helper to validate field editability
function validateFieldEditability(attribute: string): { valid: boolean; error?: string } {
  const spec = OPENAI_FEED_SPEC.find(s => s.attribute === attribute);
  if (spec && !isProductEditable(spec)) {
    const reason = spec.isFeatureDisabled ? 'feature not yet available'
      : spec.isAutoPopulated ? 'auto-populated from other fields'
      : spec.isShopManaged ? 'managed at shop level'
      : 'not editable at product level';
    return { valid: false, error: `Field "${attribute}" cannot be edited: ${reason}` };
  }
  return { valid: true };
}

// Helper to validate bulk update operation before processing
function validateBulkOperation(update: BulkUpdateOperation): { valid: boolean; error?: string } {
  if (update.type === 'enable_search') {
    return { valid: true };
  }

  const editability = validateFieldEditability(update.attribute);
  if (!editability.valid) {
    return editability;
  }

  if (update.type === 'field_mapping' && LOCKED_FIELD_SET.has(update.attribute)) {
    return { valid: false, error: `Custom mapping not allowed for locked field: ${update.attribute}` };
  }

  if (update.type === 'static_override') {
    const isLockedField = LOCKED_FIELD_SET.has(update.attribute);
    const allowsStaticOverride = STATIC_OVERRIDE_ALLOWED_LOCKED_FIELDS.has(update.attribute);

    if (isLockedField && !allowsStaticOverride) {
      return { valid: false, error: `Static override not allowed for locked field: ${update.attribute}` };
    }

    const validation = validateStaticValue(update.attribute, update.value);
    if (!validation.isValid) {
      return { valid: false, error: validation.error || 'Invalid static value' };
    }
  }

  return { valid: true };
}

const updateProductSchema = z.object({
  manualTitle: z.string().optional(),
  manualDescription: z.string().optional(),
  feedEnableSearch: z.boolean().optional(),
});

// Bulk update schema and types

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
  selectionMode: z.enum(['selected', 'filtered', 'all', 'itemGroup']),
  productIds: z.array(z.string()).optional(),
  filters: bulkUpdateFilterSchema.optional(),
  itemGroupId: z.string().optional(),
  update: bulkUpdateOperationSchema,
}).refine((data) => {
  if (data.selectionMode === 'selected') {
    return data.productIds && data.productIds.length > 0;
  }
  if (data.selectionMode === 'itemGroup') {
    return data.itemGroupId && data.itemGroupId.length > 0;
  }
  return true;
}, { message: 'productIds required when selectionMode is "selected", itemGroupId required when selectionMode is "itemGroup"' });

type BulkUpdateOperation = z.infer<typeof bulkUpdateOperationSchema>;

function parseColumnFilters(query: Record<string, unknown>): Record<string, { text?: string; values?: string[] }> | undefined {
  const columnFilters: Record<string, { text?: string; values?: string[] }> = {};
  const CF_PREFIX = 'cf_';
  const CF_TEXT_SUFFIX = '_t';
  const CF_VALUES_SUFFIX = '_v';
  const CF_SEPARATOR = '|';

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
      const separator = value.includes(CF_SEPARATOR) ? CF_SEPARATOR : ',';
      columnFilters[columnId].values = value.split(separator).filter(Boolean);
    }
  }

  return Object.keys(columnFilters).length > 0 ? columnFilters : undefined;
}

export async function listProducts(req: Request, res: Response) {
  const { id } = req.params;
  const columnFilters = parseColumnFilters(req.query as Record<string, unknown>);

  const options: ListProductsOptions = {
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 20),
    sortBy: (req.query.sortBy as ListProductsOptions['sortBy']) || 'updatedAt',
    sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    search: req.query.search as string | undefined,
    columnFilters,
  };

  try {
    const result = await listProductsForShop(id, options);
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
    return res.json(result);
  } catch (err) {
    logger.error('Failed to list products', {
      error: toError(err),
      shopId: id,
      options,
      userId: getUserId(req),
    });
    return res.status(500).json({ error: toError(err).message });
  }
}

export async function updateProduct(req: Request, res: Response) {
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

  try {
    const product = await updateProductRecord(id, pid, parse.data);
    if (!product) {
      logger.warn('Product not found for update', { shopId: id, productId: pid });
      return res.status(404).json({ error: 'Product not found' });
    }

    if (parse.data.feedEnableSearch !== undefined) {
      await updateEnableSearchOverride(pid, id, parse.data.feedEnableSearch);
      await reprocessProduct(pid);
    }

    logger.info('Product updated successfully', {
      shopId: id,
      productId: pid,
      updatedFields: Object.keys(parse.data),
      userId: getUserId(req),
    });

    const updatedProduct = await prisma.product.findUnique({
      where: { id: pid },
    });

    return res.json({ product: updatedProduct });
  } catch (err) {
    logger.error('Failed to update product', {
      error: toError(err),
      shopId: id,
      productId: pid,
      updateData: parse.data,
      userId: getUserId(req),
    });
    return res.status(500).json({ error: toError(err).message });
  }
}

const BULK_UPDATE_CHUNK_SIZE = 100;

async function applyBulkUpdateToProduct(
  productId: string,
  update: BulkUpdateOperation,
  shopId: string
): Promise<void> {
  switch (update.type) {
    case 'enable_search': {
      await prisma.product.update({
        where: { id: productId },
        data: { feedEnableSearch: update.value, updatedAt: new Date() },
      });
      await updateEnableSearchOverride(productId, shopId, update.value);
      await reprocessProduct(productId);
      break;
    }

    case 'field_mapping': {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { productFieldOverrides: true },
      });

      const overrides = getProductOverrides(product);
      overrides[update.attribute] = { type: 'mapping', value: update.wooField };

      await prisma.product.update({
        where: { id: productId },
        data: { productFieldOverrides: overrides as unknown as Prisma.InputJsonValue, updatedAt: new Date() },
      });
      await reprocessProduct(productId);
      break;
    }

    case 'static_override': {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { productFieldOverrides: true },
      });

      const overrides = getProductOverrides(product);
      overrides[update.attribute] = { type: 'static', value: update.value };

      await prisma.product.update({
        where: { id: productId },
        data: { productFieldOverrides: overrides as unknown as Prisma.InputJsonValue, updatedAt: new Date() },
      });
      await reprocessProduct(productId);
      break;
    }

    case 'remove_override': {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { productFieldOverrides: true },
      });

      const overrides = getProductOverrides(product);

      if (overrides[update.attribute]) {
        delete overrides[update.attribute];

        await prisma.product.update({
          where: { id: productId },
          data: { productFieldOverrides: overrides as unknown as Prisma.InputJsonValue, updatedAt: new Date() },
        });
        await reprocessProduct(productId);
      }
      break;
    }
  }
}

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

  const { selectionMode, productIds: selectedIds, filters, itemGroupId, update } = parse.data;

  try {
    const operationValidation = validateBulkOperation(update);
    if (!operationValidation.valid) {
      return res.status(400).json({ error: operationValidation.error });
    }

    let productIdsToUpdate: string[];

    if (selectionMode === 'selected') {
      productIdsToUpdate = selectedIds!;
    } else if (selectionMode === 'all') {
      productIdsToUpdate = await getFilteredProductIds(shopId, {});
    } else if (selectionMode === 'itemGroup') {
      productIdsToUpdate = await getProductIdsByItemGroupId(shopId, itemGroupId!);
    } else {
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
      userId: getUserId(req),
    });

    const errors: Array<{ productId: string; error: string }> = [];
    let processedCount = 0;

    for (let i = 0; i < productIdsToUpdate.length; i += BULK_UPDATE_CHUNK_SIZE) {
      const chunk = productIdsToUpdate.slice(i, i + BULK_UPDATE_CHUNK_SIZE);

      const results = await Promise.all(
        chunk.map(async (productId) => {
          try {
            await applyBulkUpdateToProduct(productId, update, shopId);
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
      userId: getUserId(req),
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
      error: toError(err),
      shopId,
      selectionMode,
      updateType: update.type,
      userId: getUserId(req),
    });
    res.status(500).json({ error: toError(err).message });
  }
}

export async function getItemGroupCount(req: Request, res: Response) {
  const { id: shopId, itemGroupId } = req.params;

  if (!itemGroupId) {
    return res.status(400).json({ error: 'itemGroupId parameter is required' });
  }

  try {
    const count = await countProductsByItemGroupId(shopId, itemGroupId);

    logger.info('Item group count retrieved', {
      shopId,
      itemGroupId,
      count,
    });

    res.json({ itemGroupId, count });
  } catch (err) {
    logger.error('Failed to get item group count', {
      error: toError(err),
      shopId,
      itemGroupId,
      userId: getUserId(req),
    });
    res.status(500).json({ error: 'Failed to fetch item group count' });
  }
}

export async function getColumnValues(req: Request, res: Response) {
  const { id: shopId } = req.params;
  const column = req.query.column as string;
  const limit = Number(req.query.limit) || 10000;
  const search = req.query.search as string | undefined;

  if (!column) {
    return res.status(400).json({ error: 'column query parameter is required' });
  }

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
      error: toError(err),
      shopId,
      column,
      userId: getUserId(req),
    });
    res.status(500).json({ error: 'Failed to fetch column values' });
  }
}

export async function getProductWooData(req: Request, res: Response) {
  const { id: shopId, pid: productId } = req.params;

  try {
    const product = await prisma.product.findFirst({
      where: { shopId, id: productId },
      select: { wooRawJson: true },
    });

    if (!product) {
      logger.warn('Product not found for WooCommerce data', { shopId, productId });
      return res.status(404).json({ error: 'Product not found' });
    }

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
      error: toError(err),
      shopId,
      productId,
      userId: getUserId(req),
    });
    res.status(500).json({ error: toError(err).message });
  }
}

// Product field override schema

const productOverrideSchema = z.object({
  type: z.enum(['mapping', 'static']),
  value: z.string().nullable(),
});

const updateOverridesSchema = z.object({
  overrides: z.record(z.string(), productOverrideSchema),
});

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

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { defaultEnableSearch: true },
    });

    const productOverrides = getProductOverrides(product);

    logger.info('Product field overrides retrieved', {
      shopId,
      productId,
      overrideCount: Object.keys(productOverrides).length,
    });

    const openaiData = product.openaiAutoFilled as Record<string, unknown> | null;
    const productTitle = (openaiData?.title as string) || product.wooTitle;

    res.json({
      productId: product.id,
      productTitle,
      overrides: productOverrides,
      resolvedValues: product.openaiAutoFilled || {},
      feedEnableSearch: product.feedEnableSearch,
      feedEnableCheckout: product.feedEnableCheckout,
      shopDefaultEnableSearch: shop?.defaultEnableSearch ?? true,
      isValid: product.isValid,
      validationErrors: product.validationErrors,
    });
  } catch (err) {
    logger.error('Failed to get product field overrides', {
      error: toError(err),
      shopId,
      productId,
    });
    res.status(500).json({ error: 'Failed to fetch field overrides' });
  }
}

export async function updateProductFieldOverrides(req: Request, res: Response) {
  const { id: shopId, pid: productId } = req.params;

  const parse = updateOverridesSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { overrides } = parse.data;

  try {
    const product = await prisma.product.findFirst({
      where: { shopId, id: productId },
      select: { id: true },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const validationErrors: Record<string, string> = {};

    for (const [attribute, override] of Object.entries(overrides)) {
      if (attribute === 'enable_search') {
        validationErrors[attribute] = 'enable_search must be updated via the product endpoint, not overrides';
        continue;
      }

      const editability = validateFieldEditability(attribute);
      if (!editability.valid) {
        validationErrors[attribute] = editability.error!.replace(/^Field "\w+" cannot be edited: /, 'Cannot edit: ');
        continue;
      }

      const isLockedField = LOCKED_FIELD_SET.has(attribute);
      const allowsStaticOverride = STATIC_OVERRIDE_ALLOWED_LOCKED_FIELDS.has(attribute);

      if (override.type === 'mapping' && isLockedField) {
        validationErrors[attribute] = 'Custom mapping not allowed for locked fields';
        continue;
      }

      if (override.type === 'static' && isLockedField && !allowsStaticOverride) {
        validationErrors[attribute] = 'Static value not allowed for this locked field';
        continue;
      }

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
      return res.status(400).json({ error: 'Validation failed', validationErrors });
    }

    // Update product overrides
    await prisma.product.update({
      where: { id: productId },
      data: {
        productFieldOverrides: overrides,
      },
    });

    await reprocessProduct(productId);

    const updatedProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        productFieldOverrides: true,
        openaiAutoFilled: true,
        feedEnableSearch: true,
        feedEnableCheckout: true,
        isValid: true,
        validationErrors: true,
      },
    });

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { defaultEnableSearch: true },
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
      feedEnableSearch: updatedProduct?.feedEnableSearch,
      feedEnableCheckout: updatedProduct?.feedEnableCheckout,
      shopDefaultEnableSearch: shop?.defaultEnableSearch ?? true,
      isValid: updatedProduct?.isValid,
      validationErrors: updatedProduct?.validationErrors,
    });
  } catch (err) {
    logger.error('Failed to update product field overrides', {
      error: toError(err),
      shopId,
      productId,
    });
    res.status(500).json({ error: 'Failed to update field overrides' });
  }
}

