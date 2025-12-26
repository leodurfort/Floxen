import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════
// LIST PRODUCTS OPTIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface ColumnFilter {
  text?: string;      // Text search within column
  values?: string[];  // Selected checkbox values
}

export interface ListProductsOptions {
  page?: number;
  limit?: number;
  sortBy?: string; // Any column ID (database column or OpenAI attribute)
  sortOrder?: 'asc' | 'desc';
  search?: string;
  columnFilters?: Record<string, ColumnFilter>;
}

// ═══════════════════════════════════════════════════════════════════════════
// COLUMN CONFIGURATION (used for both sorting and filtering)
// ═══════════════════════════════════════════════════════════════════════════

// Columns stored directly in Product table (for Prisma queries)
const DATABASE_COLUMNS: Record<string, string> = {
  'syncStatus': 'syncStatus',
  'isValid': 'isValid',
  'updatedAt': 'updatedAt',
  'feedEnableSearch': 'feedEnableSearch',
};

// Computed columns that require special SQL handling
const COMPUTED_SORT_COLUMNS = new Set([
  'overrides', // Sort by count of keys in productFieldOverrides JSON
]);

// All OpenAI attributes - queried via JSON path on openaiAutoFilled JSONB column
const OPENAI_COLUMNS = new Set([
  // Core attributes
  'id', 'title', 'description', 'link', 'image_link', 'price', 'sale_price',
  'availability', 'inventory_quantity', 'condition', 'brand', 'product_category',
  'enable_search', 'gtin', 'mpn', 'sku',
  // Product details
  'material', 'weight', 'age_group', 'color', 'size', 'gender', 'size_type', 'size_system',
  'item_group_id', 'product_detail', 'product_highlight',
  // Shipping & fulfillment
  'shipping', 'shipping_label', 'shipping_weight', 'shipping_length', 'shipping_width',
  'shipping_height', 'ships_from_country', 'free_shipping_threshold', 'transit_time_label',
  'min_handling_time', 'max_handling_time',
  // Pricing & tax
  'cost_of_goods_sold', 'product_fee', 'tax', 'tax_category', 'installment',
  'unit_pricing_measure', 'unit_pricing_base_measure', 'auto_pricing_min_price',
  // Seller & policies
  'seller_name', 'return_policy', 'return_window',
  // Marketing & labels
  'ads_redirect', 'custom_label_0', 'custom_label_1', 'custom_label_2',
  'custom_label_3', 'custom_label_4', 'promotion_id',
  // Destinations & visibility
  'excluded_destination', 'included_destination', 'shopping_ads_excluded_country', 'pause',
  // Other
  'additional_image_link', 'expiration_date', 'sale_price_effective_date',
  'multipack', 'is_bundle', 'certification', 'energy_efficiency_class',
  'min_energy_efficiency_class', 'max_energy_efficiency_class',
  'loyalty_points', 'pickup_method', 'pickup_sla', 'link_template',
  'mobile_link_template', 'disclosure_date', 'quantity_limit', 'store_code',
]);

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
 * Map column filter to database column name
 * Returns null if the column doesn't have a direct database mapping
 */
function getDbColumnForFilter(columnId: string): string | null {
  // Direct database column mappings
  const dbMappings: Record<string, string> = {
    syncStatus: 'syncStatus',
    isValid: 'isValid',
    updatedAt: 'updatedAt',
    feedEnableSearch: 'feedEnableSearch',
    enable_search: 'feedEnableSearch', // OpenAI attribute name maps to DB column
  };
  return dbMappings[columnId] || null;
}

/**
 * Build Prisma WHERE clause from filter options
 */
function buildWhereClause(
  shopId: string,
  parentIds: number[],
  options: ListProductsOptions
): Prisma.ProductWhereInput {
  const { search, columnFilters } = options;

  const where: Prisma.ProductWhereInput = {
    shopId,
    wooProductId: { notIn: parentIds },
  };

  const andConditions: Prisma.ProductWhereInput[] = [];

  // Global text search on title and SKU
  if (search && search.trim()) {
    andConditions.push({
      OR: [
        { wooTitle: { contains: search.trim(), mode: 'insensitive' } },
        { wooSku: { contains: search.trim(), mode: 'insensitive' } },
      ],
    });
  }

  // Process column filters
  if (columnFilters) {
    for (const [columnId, filter] of Object.entries(columnFilters)) {
      if (!filter.values?.length && !filter.text) continue;

      const dbColumn = getDbColumnForFilter(columnId);

      // Handle value filters (checkbox selections)
      if (filter.values?.length) {
        if (columnId === 'syncStatus' && dbColumn) {
          // syncStatus is an enum - cast values
          andConditions.push({
            [dbColumn]: { in: filter.values },
          });
        } else if ((columnId === 'isValid' || columnId === 'feedEnableSearch' || columnId === 'enable_search') && dbColumn) {
          // Boolean columns - convert string 'true'/'false' to boolean
          const boolValue = filter.values.includes('true');
          andConditions.push({ [dbColumn]: boolValue });
        } else if (columnId === 'availability') {
          // Map OpenAI availability values to WooCommerce stock status
          const stockMap: Record<string, string> = {
            'in_stock': 'instock',
            'out_of_stock': 'outofstock',
            'preorder': 'onbackorder',
          };
          const mappedValues = filter.values.map(v => stockMap[v] || v);
          andConditions.push({ wooStockStatus: { in: mappedValues } });
        } else if (columnId === 'overrides') {
          // Overrides column - filter by override count
          const hasOverrides = filter.values.some(v => v !== '0');
          const hasNoOverrides = filter.values.includes('0');

          if (hasOverrides && !hasNoOverrides) {
            // Only products with overrides
            andConditions.push({
              NOT: {
                OR: [
                  { productFieldOverrides: { equals: Prisma.JsonNull } },
                  { productFieldOverrides: { equals: {} } },
                ],
              },
            });
          } else if (hasNoOverrides && !hasOverrides) {
            // Only products without overrides
            andConditions.push({
              OR: [
                { productFieldOverrides: { equals: Prisma.JsonNull } },
                { productFieldOverrides: { equals: {} } },
              ],
            });
          }
          // If both selected, no filter needed (show all)
        }
        // Note: OpenAI JSON column filters are handled in raw SQL path
      }
    }
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
}

type SortType =
  | { type: 'prisma'; orderBy: Prisma.ProductOrderByWithRelationInput }
  | { type: 'json'; attribute: string; order: 'asc' | 'desc' }
  | { type: 'computed'; column: string; order: 'asc' | 'desc' };

/**
 * Build the orderBy clause for a given column
 * Supports database columns, OpenAI JSON attributes, and computed columns
 */
function buildOrderByClause(sortBy: string, sortOrder: 'asc' | 'desc'): SortType {
  // Check if it's a database column
  const dbColumn = DATABASE_COLUMNS[sortBy];
  if (dbColumn) {
    return { type: 'prisma', orderBy: { [dbColumn]: sortOrder } };
  }

  // Check if it's a computed column
  if (COMPUTED_SORT_COLUMNS.has(sortBy)) {
    return { type: 'computed', column: sortBy, order: sortOrder };
  }

  // Check if it's an OpenAI JSON attribute
  if (OPENAI_COLUMNS.has(sortBy)) {
    return { type: 'json', attribute: sortBy, order: sortOrder };
  }

  // Default to updatedAt
  return { type: 'prisma', orderBy: { updatedAt: sortOrder } };
}

/**
 * Escape a string for safe SQL interpolation (prevent SQL injection)
 */
function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''").replace(/\\/g, '\\\\');
}

/**
 * Build raw SQL WHERE clause for complex queries
 */
function buildRawWhereClause(shopId: string, parentIds: number[], options: ListProductsOptions): string {
  const whereConditions: string[] = [
    `"shopId" = '${escapeSqlString(shopId)}'`,
    `"wooProductId" NOT IN (${parentIds.length > 0 ? parentIds.join(',') : '0'})`,
  ];

  // Global text search
  if (options.search?.trim()) {
    const searchEscaped = escapeSqlString(options.search.trim());
    whereConditions.push(`("wooTitle" ILIKE '%${searchEscaped}%' OR "wooSku" ILIKE '%${searchEscaped}%')`);
  }

  // Process column filters
  const cf = options.columnFilters;
  if (cf) {
    // syncStatus column
    if (cf.syncStatus?.values?.length) {
      const statuses = cf.syncStatus.values.map(s => `'${escapeSqlString(s)}'`).join(',');
      whereConditions.push(`"syncStatus" IN (${statuses})`);
    }

    // isValid column
    if (cf.isValid?.values?.length) {
      const boolValue = cf.isValid.values.includes('true');
      whereConditions.push(`"isValid" = ${boolValue}`);
    }

    // enable_search / feedEnableSearch column
    if (cf.enable_search?.values?.length) {
      const boolValue = cf.enable_search.values.includes('true');
      whereConditions.push(`"feedEnableSearch" = ${boolValue}`);
    }

    // availability column -> maps to wooStockStatus
    if (cf.availability?.values?.length) {
      const stockMap: Record<string, string> = {
        'in_stock': 'instock',
        'out_of_stock': 'outofstock',
        'preorder': 'onbackorder',
      };
      const mappedValues = cf.availability.values.map(v => stockMap[v] || v);
      const statuses = mappedValues.map(s => `'${escapeSqlString(s)}'`).join(',');
      whereConditions.push(`"wooStockStatus" IN (${statuses})`);
    }

    // overrides column
    if (cf.overrides?.values?.length) {
      const hasOverrides = cf.overrides.values.some(v => v !== '0');
      const hasNoOverrides = cf.overrides.values.includes('0');

      if (hasOverrides && !hasNoOverrides) {
        whereConditions.push(`("productFieldOverrides" IS NOT NULL AND "productFieldOverrides" != '{}'::jsonb)`);
      } else if (hasNoOverrides && !hasOverrides) {
        whereConditions.push(`("productFieldOverrides" IS NULL OR "productFieldOverrides" = '{}'::jsonb)`);
      }
    }

    // Handle OpenAI JSON column filters (text and value filters)
    for (const [columnId, filter] of Object.entries(cf)) {
      // Skip already handled columns
      if (['syncStatus', 'isValid', 'enable_search', 'availability', 'overrides'].includes(columnId)) {
        continue;
      }

      // Check if it's an OpenAI attribute
      if (OPENAI_COLUMNS.has(columnId)) {
        // Text filter on OpenAI JSON attribute
        if (filter.text?.trim()) {
          const textEscaped = escapeSqlString(filter.text.trim());
          whereConditions.push(`"openaiAutoFilled"->>'${columnId}' ILIKE '%${textEscaped}%'`);
        }

        // Value filter on OpenAI JSON attribute
        if (filter.values?.length) {
          const values = filter.values.map(v => `'${escapeSqlString(v)}'`).join(',');
          whereConditions.push(`"openaiAutoFilled"->>'${columnId}' IN (${values})`);
        }
      }
    }
  }

  return whereConditions.join(' AND ');
}

/**
 * Get ORDER BY SQL for computed columns
 */
function getComputedOrderBy(column: string, direction: string): string {
  switch (column) {
    case 'overrides':
      // Sort by count of keys in productFieldOverrides JSON
      return `COALESCE(jsonb_array_length(jsonb_path_query_array("productFieldOverrides", '$.*')), 0) ${direction}`;
    default:
      return `"updatedAt" ${direction}`;
  }
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
  const sortType = buildOrderByClause(sortBy, sortOrder);

  // Handle JSON and computed sorts with raw SQL (Prisma can't order by JSONB paths)
  if (sortType.type === 'json' || sortType.type === 'computed') {
    // Use raw SQL WHERE clause for these queries
    const whereClause = buildRawWhereClause(shopId, parentIds, options);
    const direction = sortType.order.toUpperCase();

    let orderByClause: string;
    if (sortType.type === 'json') {
      orderByClause = `"openaiAutoFilled"->>'${sortType.attribute}' ${direction} NULLS LAST`;
    } else {
      orderByClause = getComputedOrderBy(sortType.column, direction);
    }

    const items = await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM "Product"
      WHERE ${whereClause}
      ORDER BY ${orderByClause}
      LIMIT ${limit} OFFSET ${skip}
    `);

    const countResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(`
      SELECT COUNT(*) as count FROM "Product"
      WHERE ${whereClause}
    `);
    const total = Number(countResult[0]?.count || 0);

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

  // Standard Prisma query for database columns
  const where = buildWhereClause(shopId, parentIds, options);
  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: sortType.orderBy,
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

// ═══════════════════════════════════════════════════════════════════════════
// COLUMN VALUES FOR FILTERING
// ═══════════════════════════════════════════════════════════════════════════

export interface ColumnValueResult {
  value: string;
  label: string;
  count: number;
}

export interface GetColumnValuesResult {
  column: string;
  values: ColumnValueResult[];
  totalDistinct: number;
  truncated: boolean;
}

/**
 * Get unique values for a column to populate filter dropdown
 */
export async function getColumnValues(
  shopId: string,
  column: string,
  limit: number = 100,
  search?: string
): Promise<GetColumnValuesResult> {
  const parentIds = await getParentProductIds(shopId);

  // Check if it's a database column
  if (DATABASE_COLUMNS[column]) {
    return getDatabaseColumnValues(shopId, parentIds, column, limit, search);
  }

  // Check if it's a computed column
  if (COMPUTED_SORT_COLUMNS.has(column)) {
    return getComputedColumnValues(shopId, parentIds, column, limit, search);
  }

  // Check if it's an OpenAI attribute
  if (OPENAI_COLUMNS.has(column)) {
    return getOpenAIColumnValues(shopId, parentIds, column, limit, search);
  }

  // Default: try as OpenAI attribute
  return getOpenAIColumnValues(shopId, parentIds, column, limit, search);
}

/**
 * Get unique values for a computed column (like overrides count)
 */
async function getComputedColumnValues(
  shopId: string,
  parentIds: number[],
  column: string,
  limit: number,
  search?: string
): Promise<GetColumnValuesResult> {
  if (column === 'overrides') {
    // Count products by override count (0, 1, 2, 3+)
    const products = await prisma.product.findMany({
      where: {
        shopId,
        wooProductId: { notIn: parentIds },
      },
      select: {
        productFieldOverrides: true,
      },
    });

    const valueCounts = new Map<string, number>();
    for (const product of products) {
      const overrides = product.productFieldOverrides as Record<string, unknown> | null;
      const count = overrides ? Object.keys(overrides).length : 0;
      const value = String(count);
      valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
    }

    let values = Array.from(valueCounts.entries())
      .map(([value, count]) => ({
        value,
        label: value === '0' ? 'No overrides' : `${value} override${value === '1' ? '' : 's'}`,
        count,
      }))
      .sort((a, b) => Number(a.value) - Number(b.value));

    if (search?.trim()) {
      const searchLower = search.toLowerCase();
      values = values.filter(
        v => v.value.includes(searchLower) || v.label.toLowerCase().includes(searchLower)
      );
    }

    return {
      column,
      values: values.slice(0, limit),
      totalDistinct: values.length,
      truncated: values.length > limit,
    };
  }

  // Fallback for unknown computed columns
  return {
    column,
    values: [],
    totalDistinct: 0,
    truncated: false,
  };
}

/**
 * Get unique values for a database column
 */
async function getDatabaseColumnValues(
  shopId: string,
  parentIds: number[],
  column: string,
  limit: number,
  search?: string
): Promise<GetColumnValuesResult> {
  const dbColumn = DATABASE_COLUMNS[column] || column;

  // Fetch all values and count in memory (simple approach for small datasets)
  const products = await prisma.product.findMany({
    where: {
      shopId,
      wooProductId: { notIn: parentIds },
    },
    select: {
      [dbColumn]: true,
    },
  });

  // Count occurrences
  const valueCounts = new Map<string, number>();
  for (const product of products) {
    const value = String((product as any)[dbColumn] ?? '');
    valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
  }

  // Convert to array and sort by count
  let values = Array.from(valueCounts.entries())
    .map(([value, count]) => ({
      value,
      label: formatValueLabel(value, column),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // Filter by search if provided
  if (search && search.trim()) {
    const searchLower = search.toLowerCase();
    values = values.filter(
      v => v.value.toLowerCase().includes(searchLower) ||
           v.label.toLowerCase().includes(searchLower)
    );
  }

  const totalDistinct = values.length;
  const truncated = values.length > limit;

  return {
    column,
    values: values.slice(0, limit),
    totalDistinct,
    truncated,
  };
}

/**
 * Get unique values for an OpenAI attribute from openaiAutoFilled JSON
 */
async function getOpenAIColumnValues(
  shopId: string,
  parentIds: number[],
  column: string,
  limit: number,
  search?: string
): Promise<GetColumnValuesResult> {
  // Fetch openaiAutoFilled for all products
  const products = await prisma.product.findMany({
    where: {
      shopId,
      wooProductId: { notIn: parentIds },
    },
    select: {
      openaiAutoFilled: true,
    },
  });

  // Extract values from JSON
  const valueCounts = new Map<string, number>();
  for (const product of products) {
    const openai = product.openaiAutoFilled as Record<string, unknown> | null;
    if (!openai) continue;

    const rawValue = openai[column];
    if (rawValue === null || rawValue === undefined || rawValue === '') continue;

    const value = String(rawValue);
    valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
  }

  // Convert to array and sort by count
  let values = Array.from(valueCounts.entries())
    .map(([value, count]) => ({
      value,
      label: formatValueLabel(value, column),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // Filter by search if provided
  if (search && search.trim()) {
    const searchLower = search.toLowerCase();
    values = values.filter(
      v => v.value.toLowerCase().includes(searchLower) ||
           v.label.toLowerCase().includes(searchLower)
    );
  }

  const totalDistinct = values.length;
  const truncated = values.length > limit;

  return {
    column,
    values: values.slice(0, limit),
    totalDistinct,
    truncated,
  };
}

/**
 * Format value for display label
 */
function formatValueLabel(value: string, column: string): string {
  // Boolean values
  if (value === 'true') return 'Yes';
  if (value === 'false') return 'No';

  // Enum values - capitalize
  if (['syncStatus', 'availability', 'condition', 'gender', 'age_group'].includes(column)) {
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase().replace(/_/g, ' ');
  }

  return value;
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
