import { Request, Response } from 'express';
import { z } from 'zod';
import { getUserId } from '../utils/request';
import {
  buildWooAuthUrl,
  createShop as createShopRecord,
  deleteShop as deleteShopRecord,
  getShop as getShopRecord,
  listShopsByUser,
  setWooCredentials,
  updateShop as updateShopRecord,
} from '../services/shopService';
import { LOCKED_FIELD_MAPPINGS, LOCKED_FIELD_SET } from '@productsynch/shared';
import { DEFAULT_FIELD_MAPPINGS } from '../config/default-field-mappings';
import { syncQueue, syncFlowProducer, isQueueAvailable, DEFAULT_JOB_OPTIONS, JOB_PRIORITIES } from '../lib/redis';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { FieldDiscoveryService } from '../services/fieldDiscoveryService';
import { clearOverridesForField, getOverrideCountsByField } from '../services/productReprocessService';

type Shop = Awaited<ReturnType<typeof getShopRecord>>;

// Helper to verify shop ownership. Returns shop if valid, or sends error response and returns null.
async function verifyShopOwnership(
  req: Request,
  res: Response,
  shopId: string
): Promise<Shop | null> {
  const userId = getUserId(req);
  const shop = await getShopRecord(shopId);

  if (!shop) {
    res.status(404).json({ error: 'Store not found' });
    return null;
  }

  if (shop.userId !== userId) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }

  return shop;
}

const FLAG_FIELDS = new Set(['enable_search', 'enable_checkout']);
const ALLOWED_MAPPING_ATTRIBUTES = new Set(Object.keys(DEFAULT_FIELD_MAPPINGS));
const LOCKED_ATTRIBUTES = Array.from(LOCKED_FIELD_SET);

const createShopSchema = z.object({
  storeUrl: z.string().url(),
});

const updateShopSchema = z.object({
  syncEnabled: z.boolean().optional(),
  openaiEnabled: z.boolean().optional(),
  sellerName: z.string().nullable().optional(),
  sellerUrl: z.string().url().optional(),
  sellerPrivacyPolicy: z.string().url().nullable().optional(),
  sellerTos: z.string().url().nullable().optional(),
  returnPolicy: z.string().nullable().optional(),
  returnWindow: z.number().int().positive().nullable().optional(),
});

const openAiConfigSchema = z.object({
  openaiEnabled: z.boolean(),
  openaiEndpoint: z.string().url().optional(),
  openaiMerchantId: z.string().optional(),
});

export async function listShops(req: Request, res: Response) {
  const userId = getUserId(req);

  try {
    const shops = await listShopsByUser(userId);
    logger.info('shops:list', { userId, count: shops.length });
    return res.json({ shops });
  } catch (err: any) {
    logger.error('shops:list error', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function createShop(req: Request, res: Response) {
  const parse = createShopSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const userId = getUserId(req);

  try {
    const shop = await createShopRecord({
      userId,
      storeUrl: parse.data.storeUrl,
    });
    const authUrl = buildWooAuthUrl(parse.data.storeUrl, userId, shop.id);
    logger.info('shops:create', { userId, shopId: shop.id, storeUrl: parse.data.storeUrl });
    return res.status(201).json({ shop, authUrl });
  } catch (err: any) {
    logger.error('shops:create error', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function getShop(req: Request, res: Response) {
  try {
    const shop = await verifyShopOwnership(req, res, req.params.id);
    if (!shop) return;

    logger.info('shops:get', { shopId: shop.id, userId: shop.userId });
    return res.json({ shop });
  } catch (err: any) {
    logger.error('shops:get error', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Get OAuth URL for retrying connection on an unconnected shop
 */
export async function getOAuthUrl(req: Request, res: Response) {
  try {
    const shop = await verifyShopOwnership(req, res, req.params.id);
    if (!shop) return;

    // Only allow retry for unconnected shops
    if (shop.isConnected) {
      return res.status(400).json({ error: 'Shop is already connected' });
    }

    const userId = getUserId(req);
    const authUrl = buildWooAuthUrl(shop.wooStoreUrl, userId, shop.id);

    logger.info('shops:get-oauth-url', { shopId: shop.id, userId });
    return res.json({ authUrl });
  } catch (err: any) {
    logger.error('shops:get-oauth-url error', err);
    return res.status(500).json({ error: err.message });
  }
}

const AUTOFILL_AFFECTING_FIELDS = new Set([
  'sellerName',
  'sellerUrl',
  'sellerPrivacyPolicy',
  'sellerTos',
  'returnPolicy',
  'returnWindow',
]);

export async function updateShop(req: Request, res: Response) {
  const parse = updateShopSchema.safeParse(req.body);
  if (!parse.success) {
    logger.warn('shops:update invalid', parse.error.flatten());
    return res.status(400).json({ error: parse.error.flatten() });
  }

  try {
    const existingShop = await verifyShopOwnership(req, res, req.params.id);
    if (!existingShop) return;

    // Check if any auto-fill affecting fields were updated
    const updatedFields = Object.keys(parse.data);
    const affectsAutofill = updatedFields.some((field) => AUTOFILL_AFFECTING_FIELDS.has(field));

    // Include shopSettingsUpdatedAt if auto-fill affecting fields changed
    const updateData = affectsAutofill
      ? { ...parse.data, shopSettingsUpdatedAt: new Date() }
      : parse.data;

    const shop = await updateShopRecord(req.params.id, updateData);
    if (!shop) return res.status(404).json({ error: 'Store not found' });

    if (affectsAutofill && syncQueue) {
      await syncQueue!.add('product-reprocess', {
        shopId: shop.id,
        reason: 'shop_settings_updated',
      }, {
        ...DEFAULT_JOB_OPTIONS,
        priority: JOB_PRIORITIES.REPROCESS,
      });
      logger.info('shops:update:queued-reprocess', {
        shopId: shop.id,
        updatedFields: updatedFields.filter((f) => AUTOFILL_AFFECTING_FIELDS.has(f)),
      });
    }

    logger.info('shops:update', { shopId: shop.id });
    return res.json({ shop });
  } catch (err: any) {
    logger.error('shops:update error', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function disconnectShop(req: Request, res: Response) {
  try {
    const existingShop = await verifyShopOwnership(req, res, req.params.id);
    if (!existingShop) return;

    const shop = await deleteShopRecord(req.params.id);
    logger.info('shops:delete', { shopId: shop?.id, userId: existingShop.userId });
    return res.json({ shop, message: 'Store deleted successfully' });
  } catch (err: any) {
    logger.error('shops:delete error', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function oauthCallback(req: Request, res: Response) {
  logger.info('shops:oauth callback START', {
    shopId: req.params.id,
    query: req.query,
    body: req.body,
    headers: req.headers,
    method: req.method,
    url: req.url
  });

  // WooCommerce can send credentials in either query params or POST body
  const consumer_key = req.query.consumer_key || req.body?.consumer_key;
  const consumer_secret = req.query.consumer_secret || req.body?.consumer_secret;

  if (!consumer_key || !consumer_secret || Array.isArray(consumer_key) || Array.isArray(consumer_secret)) {
    logger.warn('shops:oauth callback missing credentials', {
      hasConsumerKey: !!consumer_key,
      hasConsumerSecret: !!consumer_secret,
      query: req.query
    });
    return res.status(400).json({ error: 'Missing consumer_key or consumer_secret' });
  }

  logger.info('shops:oauth callback credentials received', {
    shopId: req.params.id,
    consumerKeyLength: String(consumer_key).length
  });

  try {
    const shop = await setWooCredentials(req.params.id, String(consumer_key), String(consumer_secret));

    // Check user's subscription tier to determine post-connection flow
    const user = await prisma.user.findUnique({
      where: { id: shop.userId },
      select: { subscriptionTier: true },
    });
    const tier = user?.subscriptionTier || 'FREE';
    const isPro = tier === 'PROFESSIONAL';

    if (isPro) {
      // PRO tier: Full sync with auto-select all products
      // Set syncStatus to SYNCING before queueing
      await prisma.shop.update({
        where: { id: shop.id },
        data: { syncStatus: 'SYNCING' },
      });
      syncQueue?.add('product-sync', { shopId: shop.id, triggeredBy: 'oauth' }, {
        ...DEFAULT_JOB_OPTIONS,
        priority: JOB_PRIORITIES.MANUAL,
      });
      logger.info('shops:oauth callback SUCCESS - PRO tier, full sync queued', { shopId: shop.id });
      return res.json({ shop, message: 'Connection verified, sync queued', needsProductSelection: false });
    } else {
      // FREE/STARTER tier: Set syncStatus to PENDING (awaiting product selection)
      // User must select products before sync can run
      await prisma.shop.update({
        where: { id: shop.id },
        data: { syncStatus: 'PENDING' },
      });
      logger.info('shops:oauth callback SUCCESS - credentials stored, awaiting product selection', {
        shopId: shop.id,
        tier,
      });
      return res.json({
        shop,
        message: 'Connection verified',
        needsProductSelection: true,
      });
    }
  } catch (err: any) {
    logger.error('shops:oauth callback ERROR', { shopId: req.params.id, error: err.message, stack: err.stack });
    return res.status(500).json({ error: err.message });
  }
}

export async function verifyConnection(req: Request, res: Response) {
  try {
    const shop = await verifyShopOwnership(req, res, req.params.id);
    if (!shop) return;

    logger.info('shops:verify', { shopId: shop.id, userId: shop.userId, isConnected: shop.isConnected });
    return res.json({ shopId: shop.id, verified: true, status: 'connected' });
  } catch (err: any) {
    logger.error('shops:verify error', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function configureOpenAI(req: Request, res: Response) {
  const parse = openAiConfigSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  try {
    const existingShop = await verifyShopOwnership(req, res, req.params.id);
    if (!existingShop) return;

    const shop = await updateShopRecord(req.params.id, {
      openaiEnabled: parse.data.openaiEnabled,
      openaiEndpoint: parse.data.openaiEndpoint,
      openaiMerchantId: parse.data.openaiMerchantId,
    });

    logger.info('shops:configure openai', { shopId: shop?.id, userId: existingShop.userId, enabled: shop?.openaiEnabled });
    return res.json({ shop });
  } catch (err: any) {
    logger.error('shops:configure openai error', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function getFieldMappings(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const shop = await verifyShopOwnership(req, res, id);
    if (!shop) return;

    // Get default mappings from spec
    const specDefaults = { ...DEFAULT_FIELD_MAPPINGS };

    // Query field mappings from database with joins
    const fieldMappings = await prisma.fieldMapping.findMany({
      where: { shopId: id },
      include: {
        openaiField: true,
        wooField: true,
      },
    });

    // Build user mappings (only explicit selections from database)
    const userMappings: Record<string, string | null> = {};
    for (const mapping of fieldMappings) {
      if (mapping.wooField) {
        // User has mapped this field to a WooCommerce field
        userMappings[mapping.openaiField.attribute] = mapping.wooField.value;
      } else {
        // User explicitly unmapped this field (set to null)
        userMappings[mapping.openaiField.attribute] = null;
      }
    }

    // Build merged mappings (user selections override spec defaults)
    const mappings: Record<string, string | null> = { ...specDefaults };
    for (const [attribute, value] of Object.entries(userMappings)) {
      mappings[attribute] = value;
    }

    // Add shop-level flag defaults (these are NOT field mappings, they're shop settings)
    mappings['enable_search'] = shop.defaultEnableSearch ? 'ENABLED' : 'DISABLED';
    // enable_checkout is always DISABLED (feature not yet available)
    mappings['enable_checkout'] = 'DISABLED';
    userMappings['enable_search'] = shop.defaultEnableSearch ? 'ENABLED' : 'DISABLED';
    userMappings['enable_checkout'] = 'DISABLED';

    // Force locked mappings to their required values
    for (const [attribute, lockedValue] of Object.entries(LOCKED_FIELD_MAPPINGS)) {
      mappings[attribute] = lockedValue;
      userMappings[attribute] = lockedValue;
    }

    // Get override counts for all fields (for conditional modal display)
    const overrideCounts = await getOverrideCountsByField(id);

    logger.info('shops:field-mappings:get', {
      shopId: id,
      userId: shop.userId,
      dbMappings: fieldMappings.length,
      userMappings: Object.keys(userMappings).length,
      totalFields: Object.keys(mappings).length,
      fieldsWithOverrides: Object.keys(overrideCounts).length,
    });

    return res.json({
      mappings,           // Merged: user selections + spec defaults (backward compatible)
      userMappings,       // Only explicit user selections from database
      specDefaults,       // Default mappings from OpenAI spec
      overrideCounts,     // Count of products with overrides per field (for conditional modal)
    });
  } catch (err: any) {
    logger.error('shops:field-mappings:get error', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function updateFieldMappings(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const shop = await verifyShopOwnership(req, res, id);
    if (!shop) return;

    const parsedBody = z
      .object({
        mappings: z.record(z.union([z.string().max(255), z.null()])),
        propagationMode: z.enum(['apply_all', 'preserve_overrides']).optional().default('preserve_overrides'),
      })
      .safeParse(req.body);

    if (!parsedBody.success) {
      logger.warn('shops:field-mappings:update invalid payload', parsedBody.error.flatten());
      return res.status(400).json({ error: parsedBody.error.flatten() });
    }

    const { propagationMode } = parsedBody.data;

    // Normalize incoming mappings: trim strings, drop unknown attributes, convert empty to null
    const sanitizedMappings: Record<string, string | null> = {};
    for (const [attribute, rawValue] of Object.entries(parsedBody.data.mappings || {})) {
      if (!ALLOWED_MAPPING_ATTRIBUTES.has(attribute)) {
        logger.warn('shops:field-mappings:update unknown attribute', { attribute, shopId: id });
        continue;
      }

      if (rawValue === null) {
        sanitizedMappings[attribute] = null;
        continue;
      }

      const trimmed = rawValue.trim();
      sanitizedMappings[attribute] = trimmed.length ? trimmed : null;
    }

    // Strip out locked fields - they cannot be customized
    LOCKED_ATTRIBUTES.forEach((attribute) => {
      delete sanitizedMappings[attribute];
    });

    // Extract flag fields - these are shop-level settings, NOT field mappings
    const enableSearch = sanitizedMappings['enable_search'];
    // enable_checkout is ignored - it's always false (feature not yet available)
    delete sanitizedMappings['enable_search'];
    delete sanitizedMappings['enable_checkout'];

    // Validate flag values early (only enable_search, enable_checkout is always false)
    const invalidFlagValue =
      enableSearch !== undefined &&
      enableSearch !== 'ENABLED' &&
      enableSearch !== 'DISABLED';

    if (invalidFlagValue) {
      return res.status(400).json({ error: 'Invalid flag value' });
    }

    // Update shop defaults for flag fields (only enable_search, enable_checkout is always false)
    const flagUpdates: Record<string, boolean> = {};
    if (enableSearch !== undefined) {
      flagUpdates.defaultEnableSearch = enableSearch === 'ENABLED';
    }

    if (Object.keys(flagUpdates).length) {
      await prisma.shop.update({
        where: { id },
        data: {
          ...flagUpdates,
          fieldMappingsUpdatedAt: new Date(),
        },
      });
      logger.info('shops:field-mappings:update flags', {
        shopId: id,
        ...flagUpdates,
      });
    }

    // Ensure locked mappings are removed from the database
    if (LOCKED_ATTRIBUTES.length) {
      await prisma.fieldMapping.deleteMany({
        where: {
          shopId: id,
          openaiField: {
            attribute: { in: LOCKED_ATTRIBUTES },
          },
        },
      });
    }

    // Process each mapping
    const results = { created: 0, updated: 0, deleted: 0, errors: 0 };
    const actuallyChangedAttributes: string[] = []; // Track fields that actually changed
    const mappingEntries = Object.entries(sanitizedMappings).filter(
      ([attribute]) => !FLAG_FIELDS.has(attribute)
    );

    if (!mappingEntries.length) {
      logger.info('shops:field-mappings:update', { shopId: id, userId: shop.userId, results, message: 'No field mappings to process' });
      return res.json({ success: true, results });
    }

    // Preload OpenAI fields and WooCommerce fields to reduce per-iteration queries
    const attributes = mappingEntries.map(([attribute]) => attribute);
    const openaiFields = await prisma.openAIField.findMany({
      where: { attribute: { in: attributes } },
    });
    const openaiFieldByAttribute = new Map(openaiFields.map((field) => [field.attribute, field]));

    const wooFieldValues = Array.from(
      new Set(
        mappingEntries
          .map(([, value]) => value)
          .filter((value): value is string => Boolean(value))
      )
    );

    const wooFields = wooFieldValues.length
      ? await prisma.wooCommerceField.findMany({
          where: {
            value: { in: wooFieldValues },
          },
        })
      : [];

    const wooFieldByValue = new Map<string, (typeof wooFields)[number]>();
    for (const field of wooFields) {
      wooFieldByValue.set(field.value, field);
    }

    const existingMappings = await prisma.fieldMapping.findMany({
      where: { shopId: id },
    });
    const existingByOpenaiId = new Map(existingMappings.map((mapping) => [mapping.openaiFieldId, mapping]));

    for (const [openaiAttribute, wooFieldValue] of mappingEntries) {
      try {
        const openaiField = openaiFieldByAttribute.get(openaiAttribute);
        if (!openaiField) {
          logger.warn(`OpenAI field "${openaiAttribute}" not found, skipping`, { shopId: id });
          results.errors++;
          continue;
        }

        const existing = existingByOpenaiId.get(openaiField.id);
        let wooFieldId: string | null = null;

        if (wooFieldValue !== null) {
          const wooField = wooFieldByValue.get(wooFieldValue);
          if (!wooField) {
            logger.warn(`WooCommerce field "${wooFieldValue}" not found, skipping`, { shopId: id });
            results.errors++;
            continue;
          }
          wooFieldId = wooField.id;
        }

        // Upsert mapping
        await prisma.fieldMapping.upsert({
          where: {
            shopId_openaiFieldId: {
              shopId: id,
              openaiFieldId: openaiField.id,
            },
          },
          create: {
            shopId: id,
            openaiFieldId: openaiField.id,
            wooFieldId,
          },
          update: {
            wooFieldId,
          },
        });

        // Track if this field actually changed
        const didChange = !existing || existing.wooFieldId !== wooFieldId;
        if (didChange) {
          actuallyChangedAttributes.push(openaiAttribute);
        }

        if (existing) {
          results.updated++;
        } else {
          results.created++;
        }
      } catch (mappingErr: any) {
        logger.error(`Error processing mapping for ${openaiAttribute}:`, mappingErr);
        results.errors++;
      }
    }

    // Update fieldMappingsUpdatedAt if any mappings were changed
    if (results.created > 0 || results.updated > 0 || results.deleted > 0) {
      await prisma.shop.update({
        where: { id },
        data: { fieldMappingsUpdatedAt: new Date() },
      });
      logger.info('shops:field-mappings:updated-at', { shopId: id });

      // Determine which fields need overrides cleared (if propagation mode is 'apply_all')
      const fieldsToClclearOverrides =
        propagationMode === 'apply_all' ? actuallyChangedAttributes : [];

      // Queue background job to reprocess all products with new mappings
      // Include fields to clear overrides for - handled in ONE pass to avoid double processing
      if (syncQueue) {
        await syncQueue!.add('product-reprocess', {
          shopId: id,
          reason: 'field_mappings_updated',
          fieldsToClclearOverrides,
          changedFields: actuallyChangedAttributes,  // Enable selective reprocessing optimization
        }, {
          ...DEFAULT_JOB_OPTIONS,
          priority: JOB_PRIORITIES.REPROCESS,
        });
        logger.info('shops:field-mappings:queued-reprocess', {
          shopId: id,
          fieldsToClclearOverrides,
          propagationMode,
        });
      } else if (fieldsToClclearOverrides.length > 0) {
        // FALLBACK: Redis unavailable, clear overrides synchronously
        logger.warn('shops:field-mappings:sync-fallback', { shopId: id });
        for (const attr of fieldsToClclearOverrides) {
          await clearOverridesForField(id, attr);
        }
      }
    }

    logger.info('shops:field-mappings:update', { shopId: id, userId: shop.userId, results, propagationMode });
    return res.json({ success: true, results });
  } catch (err: any) {
    logger.error('shops:field-mappings:update error', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Discover custom meta_data fields from shop's WooCommerce products
 * POST /api/v1/shops/:id/discover-fields
 */
export async function discoverWooFields(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const shop = await verifyShopOwnership(req, res, id);
    if (!shop) return;

    logger.info('shops:discover-fields:start', { shopId: id, userId: shop.userId });

    const result = await FieldDiscoveryService.discoverFields(id);

    logger.info('shops:discover-fields:complete', {
      shopId: id,
      userId: shop.userId,
      discovered: result.discovered.length,
      saved: result.saved,
      skipped: result.skipped,
      errors: result.errors.length,
    });

    return res.json({
      success: true,
      discovered: result.discovered.length,
      saved: result.saved,
      skipped: result.skipped,
      errors: result.errors,
      fields: result.discovered,
    });
  } catch (err: any) {
    logger.error('shops:discover-fields error', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Get all available WooCommerce fields for a shop (standard + discovered)
 * GET /api/v1/shops/:id/woo-fields
 */
export async function getWooFields(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const shop = await verifyShopOwnership(req, res, id);
    if (!shop) return;

    const fields = await FieldDiscoveryService.getShopFields(id);

    logger.info('shops:woo-fields:get', { shopId: id, userId: shop.userId, count: fields.length });

    return res.json({ fields });
  } catch (err: any) {
    logger.error('shops:woo-fields:get error', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * Test endpoint: Fetch settings directly from WooCommerce API
 * GET /api/v1/shops/:id/test-woo-settings
 */
export async function testWooSettings(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const shop = await prisma.shop.findFirst({
      where: { id, userId },
    });

    if (!shop || !shop.isConnected) {
      return res.status(404).json({ error: 'Store not found or not connected' });
    }

    const { createWooClient, fetchStoreSettings } = await import('../services/wooClient');

    const wooClient = createWooClient({
      storeUrl: shop.wooStoreUrl,
      consumerKey: shop.wooConsumerKey!,
      consumerSecret: shop.wooConsumerSecret!,
    });

    // Fetch settings directly from WooCommerce, pass shop URL as fallback
    const settings = await fetchStoreSettings(wooClient, shop.wooStoreUrl);

    if (!settings) {
      return res.status(500).json({ error: 'Failed to fetch settings from WooCommerce' });
    }

    // Also fetch raw API responses for debugging
    const indexResponse = await wooClient.get('');
    const generalResponse = await wooClient.get('settings/general');
    const productsResponse = await wooClient.get('settings/products');

    // Fetch WordPress settings to show store name and URL
    let wpSettings = null;
    try {
      const wpSettingsResponse = await wooClient.get('../wp/v2/settings');
      wpSettings = wpSettingsResponse.data;
    } catch (wpError: any) {
      wpSettings = { error: wpError.message };
    }

    return res.json({
      parsedSettings: settings,
      rawResponses: {
        index: indexResponse.data,
        generalSettings: generalResponse.data,
        productsSettings: productsResponse.data,
        wpSettings: wpSettings,
      },
    });
  } catch (error: any) {
    logger.error('testWooSettings error', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/v1/shops/:id/activate-feed
 * Activates the ChatGPT feed for a store:
 * - Validates store profile is complete
 * - Validates at least 1 product is ready for feed
 * - Sets openaiEnabled=true, syncEnabled=true
 * - Triggers immediate sync flow (product-sync -> feed-generation)
 */
export async function activateFeed(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const existingShop = await verifyShopOwnership(req, res, id);
    if (!existingShop) return;

    // Check if already activated
    if (existingShop.openaiEnabled && existingShop.syncEnabled) {
      return res.status(400).json({
        error: 'Feed already activated',
        code: 'ALREADY_ACTIVATED',
      });
    }

    // Validate store profile is complete
    const profileErrors: string[] = [];
    if (!existingShop.sellerName) profileErrors.push('Store name is required');
    if (!existingShop.returnPolicy) profileErrors.push('Return policy URL is required');
    if (!existingShop.returnWindow) profileErrors.push('Return window is required');

    if (profileErrors.length > 0) {
      return res.status(400).json({
        error: 'Store profile is incomplete',
        code: 'INCOMPLETE_PROFILE',
        details: profileErrors,
      });
    }

    // Check for at least 1 valid product ready for feed
    const validProductCount = await prisma.product.count({
      where: {
        shopId: id,
        isValid: true,
        feedEnableSearch: true,
      },
    });

    if (validProductCount === 0) {
      return res.status(400).json({
        error: 'No products ready for feed',
        code: 'NO_VALID_PRODUCTS',
        details: 'You need at least one valid product with search enabled to activate the feed.',
      });
    }

    // Check Redis availability
    if (!isQueueAvailable() || !syncFlowProducer) {
      return res.status(503).json({
        error: 'Sync service unavailable',
        code: 'SERVICE_UNAVAILABLE',
        details: 'Redis queue not configured. Please try again later.',
      });
    }

    // Update store flags
    const shop = await updateShopRecord(id, {
      openaiEnabled: true,
      syncEnabled: true,
    });

    // Trigger sync flow (product-sync -> feed-generation)
    await syncFlowProducer.add({
      name: 'feed-generation',
      queueName: 'sync',
      data: { shopId: id, triggeredBy: 'activate-feed' },
      opts: { ...DEFAULT_JOB_OPTIONS, priority: JOB_PRIORITIES.MANUAL },
      children: [
        {
          name: 'product-sync',
          queueName: 'sync',
          data: { shopId: id, triggeredBy: 'activate-feed' },
          opts: { ...DEFAULT_JOB_OPTIONS, priority: JOB_PRIORITIES.MANUAL },
        },
      ],
    });

    logger.info('shops:activate-feed', {
      shopId: id,
      userId: existingShop.userId,
      validProductCount,
    });

    return res.json({
      shop,
      message: 'Feed activated successfully. Sync in progress.',
      validProductCount,
    });
  } catch (err: any) {
    logger.error('shops:activate-feed error', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/v1/shops/:id/product-stats
 * Returns product counts for feed status display
 */
export async function getProductStats(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const shop = await verifyShopOwnership(req, res, id);
    if (!shop) return;

    // Get parent product IDs to exclude (same filtering as catalog list)
    const { getParentProductIds } = await import('../services/productService');
    const parentIds = await getParentProductIds(id);

    // Get counts in parallel for efficiency
    // Only count products that are selected AND synced (visible in Catalog)
    // Exclude parent products (they're just containers for variations)
    const baseFilter = {
      shopId: id,
      isSelected: true,
      syncState: 'synced' as const,
      wooProductId: { notIn: parentIds.length > 0 ? parentIds : [0] }
    };

    // Count items and products in parallel
    // Use raw SQL for contextual product counts (COALESCE groups variations with their parent)
    const [
      total,
      inFeed,
      needsAttention,
      disabled,
      productCount,
      selectedProductCount,
      productCountInFeedResult,
      productCountNeedsAttentionResult,
    ] = await Promise.all([
      prisma.product.count({ where: baseFilter }),
      prisma.product.count({
        where: { ...baseFilter, isValid: true, feedEnableSearch: true },
      }),
      prisma.product.count({
        where: { ...baseFilter, isValid: false },
      }),
      prisma.product.count({
        where: { ...baseFilter, feedEnableSearch: false },
      }),
      // Count top-level products (simple products + variable products, not variations)
      // These are what users selected - variations have wooParentId set
      prisma.product.count({
        where: {
          shopId: id,
          isSelected: true,
          syncState: 'synced' as const,
          wooParentId: null, // Only top-level products
        },
      }),
      // Count selected products regardless of sync state (for onboarding checklist)
      // This is > 0 immediately after user saves product selection
      prisma.product.count({
        where: {
          shopId: id,
          isSelected: true,
          wooParentId: null, // Only top-level products
        },
      }),
      // Count distinct products with items in feed
      // COALESCE maps variations to their parent, simple products to themselves
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT COALESCE(woo_parent_id, woo_product_id)) as count
        FROM "Product"
        WHERE shop_id = ${id}
          AND is_selected = true
          AND sync_state = 'synced'
          AND is_valid = true
          AND feed_enable_search = true
      `,
      // Count distinct products with items needing attention
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT COALESCE(woo_parent_id, woo_product_id)) as count
        FROM "Product"
        WHERE shop_id = ${id}
          AND is_selected = true
          AND sync_state = 'synced'
          AND is_valid = false
      `,
    ]);

    const productCountInFeed = Number(productCountInFeedResult[0]?.count ?? 0);
    const productCountNeedsAttention = Number(productCountNeedsAttentionResult[0]?.count ?? 0);

    logger.info('shops:product-stats', {
      shopId: id,
      userId: shop.userId,
      total,
      inFeed,
      needsAttention,
      disabled,
      productCount,
      selectedProductCount,
      productCountInFeed,
      productCountNeedsAttention,
    });

    return res.json({
      total,
      inFeed,
      needsAttention,
      disabled,
      productCount,
      selectedProductCount,
      productCountInFeed,
      productCountNeedsAttention,
    });
  } catch (err: any) {
    logger.error('shops:product-stats error', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/v1/shops/:id/discover
 * Discover WooCommerce products (parent products only) for selection UI
 */
export async function discoverProducts(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const shop = await verifyShopOwnership(req, res, id);
    if (!shop) return;

    const { discoverWooCommerceProducts } = await import('../services/productDiscoveryService');
    const result = await discoverWooCommerceProducts(id);

    logger.info('shops:discover-products', {
      shopId: id,
      userId: shop.userId,
      discovered: result.discovered,
      total: result.total,
    });

    return res.json(result);
  } catch (err: any) {
    logger.error('shops:discover-products error', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/v1/shops/:id/products/discovered
 * Get all discovered products for selection UI
 */
export async function getDiscoveredProductsList(req: Request, res: Response) {
  const { id } = req.params;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 48));
  const search = (req.query.search as string) || undefined;

  try {
    const shop = await verifyShopOwnership(req, res, id);
    if (!shop) return;

    const { getDiscoveredProducts } = await import('../services/productDiscoveryService');
    const result = await getDiscoveredProducts(id, { page, pageSize, search });

    logger.info('shops:discovered-products:list', {
      shopId: id,
      userId: shop.userId,
      total: result.total,
      selected: result.selected,
      limit: result.limit,
      page,
      pageSize,
    });

    return res.json(result);
  } catch (err: any) {
    logger.error('shops:discovered-products:list error', err);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/v1/shops/:id/products/discovered/ids
 * Get filtered product IDs for bulk selection
 */
export async function getFilteredProductIdsList(req: Request, res: Response) {
  const { id } = req.params;
  const search = (req.query.search as string) || undefined;

  try {
    const shop = await verifyShopOwnership(req, res, id);
    if (!shop) return;

    const { getFilteredProductIds } = await import('../services/productDiscoveryService');
    const result = await getFilteredProductIds(id, search);

    return res.json(result);
  } catch (err: any) {
    logger.error('shops:filtered-product-ids error', err);
    return res.status(500).json({ error: err.message });
  }
}

const updateSelectionSchema = z.object({
  productIds: z.array(z.string()),
});

/**
 * PUT /api/v1/shops/:id/products/selection
 * Update which products are selected for sync
 */
export async function updateProductSelection(req: Request, res: Response) {
  const { id } = req.params;

  const parse = updateSelectionSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  try {
    const shop = await verifyShopOwnership(req, res, id);
    if (!shop) return;

    const { updateProductSelection: updateSelection } = await import('../services/productDiscoveryService');
    const result = await updateSelection(id, parse.data.productIds);

    logger.info('shops:product-selection:update', {
      shopId: id,
      userId: shop.userId,
      selected: result.selected,
      limit: result.limit,
    });

    return res.json(result);
  } catch (err: any) {
    logger.error('shops:product-selection:update error', err);
    if (err.message.includes('exceeds tier limit')) {
      return res.status(400).json({ error: err.message, code: 'LIMIT_EXCEEDED' });
    }
    return res.status(500).json({ error: err.message });
  }
}
