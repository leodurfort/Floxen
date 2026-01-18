import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';

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

// Columns stored directly in Product table - Prisma field names (camelCase)
const DATABASE_COLUMNS: Record<string, string> = {
  'isValid': 'isValid',
  'feedStatus': 'isValid', // feedStatus column maps to isValid for sorting
  'updatedAt': 'updatedAt',
  'feedEnableSearch': 'feedEnableSearch',
};

// Same columns but with actual PostgreSQL column names (snake_case) for raw SQL
const DATABASE_COLUMNS_SQL: Record<string, string> = {
  'isValid': 'is_valid',
  'feedStatus': 'is_valid', // feedStatus column maps to is_valid for sorting
  'updatedAt': 'updated_at',
  'feedEnableSearch': 'feed_enable_search',
};

// Columns needed for catalog listing (optimized - only what frontend actually uses)
const CATALOG_COLUMNS_SQL = `
  "id",
  "is_valid",
  "validation_errors",
  "updated_at",
  "feed_enable_search",
  "openai_auto_filled",
  "product_field_overrides"
`;

// Map for catalog columns: PostgreSQL snake_case -> Prisma camelCase
const CATALOG_COLUMN_MAP: Record<string, string> = {
  is_valid: 'isValid',
  validation_errors: 'validationErrors',
  updated_at: 'updatedAt',
  feed_enable_search: 'feedEnableSearch',
  openai_auto_filled: 'openaiAutoFilled',
  product_field_overrides: 'productFieldOverrides',
};

// Prisma select for catalog listing
const CATALOG_SELECT = {
  id: true,
  isValid: true,
  validationErrors: true,
  updatedAt: true,
  feedEnableSearch: true,
  openaiAutoFilled: true,
  productFieldOverrides: true,
};

/**
 * Transform raw SQL product result from snake_case to camelCase
 * Only transforms catalog-specific columns for efficiency
 */
function transformRawProductToCamelCase(raw: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    const camelKey = CATALOG_COLUMN_MAP[key] || key;
    result[camelKey] = value;
  }
  return result;
}

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

function getDbColumnForFilter(columnId: string): string | null {
  // Direct database column mappings
  const dbMappings: Record<string, string> = {
    isValid: 'isValid',
    updatedAt: 'updatedAt',
    feedEnableSearch: 'feedEnableSearch',
    enable_search: 'feedEnableSearch', // OpenAI attribute name maps to DB column
  };
  return dbMappings[columnId] || null;
}

function requiresRawSqlFiltering(options: ListProductsOptions): boolean {
  if (options.search?.trim()) return true;
  if (!options.columnFilters) return false;

  const PRISMA_FILTERABLE_COLUMNS = new Set(['isValid', 'feedEnableSearch', 'enable_search']);

  for (const [columnId, filter] of Object.entries(options.columnFilters)) {
    if (!filter.values?.length && !filter.text) continue;
    if (COMPUTED_SORT_COLUMNS.has(columnId)) return true;
    if (!PRISMA_FILTERABLE_COLUMNS.has(columnId)) return true;
  }

  return false;
}

function buildWhereClause(
  shopId: string,
  parentIds: number[],
  options: ListProductsOptions
): Prisma.ProductWhereInput {
  const { columnFilters } = options;

  const where: Prisma.ProductWhereInput = {
    shopId,
    wooProductId: { notIn: parentIds },
    isSelected: true,
    syncState: 'synced',
  };

  const andConditions: Prisma.ProductWhereInput[] = [];

  if (columnFilters) {
    for (const [columnId, filter] of Object.entries(columnFilters)) {
      if (!filter.values?.length) continue;

      const dbColumn = getDbColumnForFilter(columnId);
      const isBooleanColumn = columnId === 'isValid' || columnId === 'feedEnableSearch' || columnId === 'enable_search';

      if (isBooleanColumn && dbColumn && filter.values.length === 1) {
        const boolValue = parseBooleanFilterValue(filter.values[0]);
        andConditions.push({ [dbColumn]: boolValue });
      }
    }
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
}

function parseBooleanFilterValue(value: string): boolean {
  const lower = value.toLowerCase();
  return lower === 'valid' || lower === 'enabled' || lower === 'true';
}

type SortType =
  | { type: 'prisma'; orderBy: Prisma.ProductOrderByWithRelationInput }
  | { type: 'json'; attribute: string; order: 'asc' | 'desc' }
  | { type: 'computed'; column: string; order: 'asc' | 'desc' };

function buildOrderByClause(sortBy: string, sortOrder: 'asc' | 'desc'): SortType {
  const dbColumn = DATABASE_COLUMNS[sortBy];
  if (dbColumn) return { type: 'prisma', orderBy: { [dbColumn]: sortOrder } };
  if (COMPUTED_SORT_COLUMNS.has(sortBy)) return { type: 'computed', column: sortBy, order: sortOrder };
  if (OPENAI_COLUMNS.has(sortBy)) return { type: 'json', attribute: sortBy, order: sortOrder };
  return { type: 'prisma', orderBy: { updatedAt: sortOrder } };
}

function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''").replace(/\\/g, '\\\\');
}

function buildRawWhereClause(shopId: string, parentIds: number[], options: ListProductsOptions): string {
  const whereConditions: string[] = [
    `"shop_id" = '${escapeSqlString(shopId)}'`,
    `"woo_product_id" NOT IN (${parentIds.length > 0 ? parentIds.join(',') : '0'})`,
    `"is_selected" = true`,
    `"sync_state" = 'synced'`,
  ];

  if (options.search?.trim()) {
    const searchEscaped = escapeSqlString(options.search.trim());
    whereConditions.push(`("openai_auto_filled"->>'title' ILIKE '%${searchEscaped}%' OR "openai_auto_filled"->>'sku' ILIKE '%${searchEscaped}%')`);
  }

  const cf = options.columnFilters;
  if (cf) {
    if (cf.isValid?.values?.length === 1) {
      whereConditions.push(`"is_valid" = ${parseBooleanFilterValue(cf.isValid.values[0])}`);
    }

    if (cf.enable_search?.values?.length === 1) {
      whereConditions.push(`"feed_enable_search" = ${parseBooleanFilterValue(cf.enable_search.values[0])}`);
    }

    if (cf.overrides?.values?.length) {
      const counts = cf.overrides.values.map(v => `'${escapeSqlString(v)}'`).join(',');
      whereConditions.push(`(
        CASE
          WHEN "product_field_overrides" IS NULL OR "product_field_overrides" = '{}'::jsonb THEN '0'
          ELSE (SELECT count(*)::text FROM jsonb_object_keys("product_field_overrides"))
        END
      ) IN (${counts})`);
    }

    for (const [columnId, filter] of Object.entries(cf)) {
      if (['isValid', 'enable_search', 'overrides'].includes(columnId)) continue;
      if (!filter.values?.length) continue;

      whereConditions.push(buildJsonFilterCondition(columnId, filter.values));
    }
  }

  return whereConditions.join(' AND ');
}

function buildJsonFilterCondition(columnId: string, values: string[]): string {
  const safeColumnId = escapeSqlString(columnId);
  const hasEmpty = values.includes('__empty__');
  const nonEmptyValues = values.filter(v => v !== '__empty__');
  const jsonPath = `"openai_auto_filled"->>'${safeColumnId}'`;

  if (hasEmpty && nonEmptyValues.length > 0) {
    const valuesStr = nonEmptyValues.map(v => `'${escapeSqlString(v)}'`).join(',');
    return `(${jsonPath} IS NULL OR ${jsonPath} = '' OR ${jsonPath} IN (${valuesStr}))`;
  }
  if (hasEmpty) {
    return `(${jsonPath} IS NULL OR ${jsonPath} = '')`;
  }
  const valuesStr = values.map(v => `'${escapeSqlString(v)}'`).join(',');
  return `${jsonPath} IN (${valuesStr})`;
}

function getComputedOrderBy(column: string, direction: string): string {
  if (column === 'overrides') {
    return `COALESCE(jsonb_array_length(jsonb_path_query_array("product_field_overrides", '$.*')), 0) ${direction}`;
  }
  return `"updated_at" ${direction}`;
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

  // Use raw SQL when:
  // 1. Sorting by JSON or computed columns (Prisma can't order by JSONB paths)
  // 2. Filtering by columns that require raw SQL (computed, OpenAI JSON)
  const needsRawSql = sortType.type === 'json' ||
                      sortType.type === 'computed' ||
                      requiresRawSqlFiltering(options);

  if (needsRawSql) {
    // Use raw SQL WHERE clause for these queries
    const whereClause = buildRawWhereClause(shopId, parentIds, options);
    const direction = sortOrder.toUpperCase();

    // Build ORDER BY clause based on sort type
    // NOTE: Uses actual PostgreSQL column names (snake_case)
    let orderByClause: string;
    if (sortType.type === 'json') {
      orderByClause = `"openai_auto_filled"->>'${sortType.attribute}' ${direction} NULLS LAST`;
    } else if (sortType.type === 'computed') {
      orderByClause = getComputedOrderBy(sortType.column, direction);
    } else {
      // Prisma sort type - use database column directly (snake_case for raw SQL)
      const dbColumn = DATABASE_COLUMNS_SQL[sortBy] || 'updated_at';
      orderByClause = `"${dbColumn}" ${direction}`;
    }

    const rawItems = await prisma.$queryRawUnsafe<any[]>(`
      SELECT ${CATALOG_COLUMNS_SQL} FROM "Product"
      WHERE ${whereClause}
      ORDER BY ${orderByClause}
      LIMIT ${limit} OFFSET ${skip}
    `);

    // Transform snake_case columns to camelCase (raw SQL returns DB column names)
    const items = rawItems.map(transformRawProductToCamelCase);

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

  // Standard Prisma query for database columns (optimized select)
  const where = buildWhereClause(shopId, parentIds, options);
  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: sortType.orderBy,
      select: CATALOG_SELECT,
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

  // Use raw SQL when filters require it (computed columns, OpenAI JSON)
  if (requiresRawSqlFiltering(options)) {
    const whereClause = buildRawWhereClause(shopId, parentIds, options);
    const products = await prisma.$queryRawUnsafe<{ id: string }[]>(`
      SELECT "id" FROM "Product"
      WHERE ${whereClause}
    `);
    return products.map(p => p.id);
  }

  // Use Prisma for simple database column filters
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

function hasActiveFilters(options: ListProductsOptions): boolean {
  if (options.search?.trim()) return true;
  if (!options.columnFilters) return false;
  return Object.values(options.columnFilters).some(
    filter => (filter.values && filter.values.length > 0) || filter.text?.trim()
  );
}

export async function getColumnValues(
  shopId: string,
  column: string,
  limit: number = 100,
  search?: string,
  currentFilters?: ListProductsOptions
): Promise<GetColumnValuesResult> {
  const parentIds = await getParentProductIds(shopId);
  const filtersExcludingSelf = excludeColumnFromFilters(column, currentFilters);

  if (DATABASE_COLUMNS[column]) {
    return getDatabaseColumnValues(shopId, parentIds, column, limit, search, filtersExcludingSelf);
  }
  if (COMPUTED_SORT_COLUMNS.has(column)) {
    return getComputedColumnValues(shopId, parentIds, column, limit, search, filtersExcludingSelf);
  }
  return getOpenAIColumnValues(shopId, parentIds, column, limit, search, filtersExcludingSelf);
}

function excludeColumnFromFilters(column: string, filters?: ListProductsOptions): ListProductsOptions | undefined {
  if (!filters) return undefined;
  return {
    ...filters,
    columnFilters: filters.columnFilters
      ? Object.fromEntries(Object.entries(filters.columnFilters).filter(([key]) => key !== column))
      : undefined,
  };
}

const EMPTY_VALUE_KEY = '__empty__';

async function getComputedColumnValues(
  shopId: string,
  parentIds: number[],
  column: string,
  limit: number,
  search?: string,
  currentFilters?: ListProductsOptions
): Promise<GetColumnValuesResult> {
  if (column !== 'overrides') {
    return { column, values: [], totalDistinct: 0, truncated: false };
  }

  const products = await fetchProductsForColumnValues(
    shopId, parentIds, currentFilters, 'product_field_overrides', 'productFieldOverrides'
  );

  const valueCounts = countValues(products, (p) => {
    const overrides = p.productFieldOverrides as Record<string, unknown> | null;
    return String(overrides ? Object.keys(overrides).length : 0);
  });

  const formatOverrideLabel = (value: string) =>
    value === '0' ? 'No custom values' : `${value} custom value${value === '1' ? '' : 's'}`;

  return buildColumnValuesResult(column, valueCounts, limit, search, formatOverrideLabel);
}

async function getDatabaseColumnValues(
  shopId: string,
  parentIds: number[],
  column: string,
  limit: number,
  search?: string,
  currentFilters?: ListProductsOptions
): Promise<GetColumnValuesResult> {
  const dbColumn = DATABASE_COLUMNS[column] || column;
  const dbColumnSql = DATABASE_COLUMNS_SQL[column] || column;

  const products = await fetchProductsForColumnValues(
    shopId, parentIds, currentFilters, dbColumnSql, dbColumn
  );

  const valueCounts = countValues(products, (p) => {
    const rawValue = (p as Record<string, unknown>)[dbColumn];
    return normalizeValueForCounting(rawValue);
  });

  return buildColumnValuesResult(column, valueCounts, limit, search, (v) => formatValueLabel(v, column));
}

async function getOpenAIColumnValues(
  shopId: string,
  parentIds: number[],
  column: string,
  limit: number,
  search?: string,
  currentFilters?: ListProductsOptions
): Promise<GetColumnValuesResult> {
  const products = await fetchProductsForColumnValues(
    shopId, parentIds, currentFilters, 'openai_auto_filled', 'openaiAutoFilled'
  );

  const valueCounts = countValues(products, (p) => {
    const openai = p.openaiAutoFilled as Record<string, unknown> | null;
    if (!openai) return EMPTY_VALUE_KEY;
    return normalizeValueForCounting(openai[column]);
  });

  return buildColumnValuesResult(column, valueCounts, limit, search, (v) => formatValueLabel(v, column));
}

async function fetchProductsForColumnValues(
  shopId: string,
  parentIds: number[],
  currentFilters: ListProductsOptions | undefined,
  sqlColumn: string,
  prismaColumn: string
): Promise<Record<string, unknown>[]> {
  if (currentFilters && hasActiveFilters(currentFilters)) {
    const whereClause = buildRawWhereClause(shopId, parentIds, currentFilters);
    const rawProducts = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
      SELECT "${sqlColumn}" FROM "Product" WHERE ${whereClause}
    `);
    return rawProducts.map(p => ({ [prismaColumn]: p[sqlColumn] }));
  }

  return prisma.product.findMany({
    where: {
      shopId,
      wooProductId: { notIn: parentIds },
      isSelected: true,
      syncState: 'synced',
    },
    select: { [prismaColumn]: true },
  });
}

function normalizeValueForCounting(rawValue: unknown): string {
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return EMPTY_VALUE_KEY;
  }
  return String(rawValue);
}

function countValues<T>(items: T[], extractor: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const value = extractor(item);
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return counts;
}

function buildColumnValuesResult(
  column: string,
  valueCounts: Map<string, number>,
  limit: number,
  search: string | undefined,
  labelFormatter: (value: string) => string
): GetColumnValuesResult {
  let values = Array.from(valueCounts.entries())
    .map(([value, count]) => ({ value, label: labelFormatter(value), count }))
    .sort((a, b) => a.label.localeCompare(b.label));

  if (search?.trim()) {
    const searchLower = search.toLowerCase();
    values = values.filter(
      v => v.value.toLowerCase().includes(searchLower) || v.label.toLowerCase().includes(searchLower)
    );
  }

  return {
    column,
    values: values.slice(0, limit),
    totalDistinct: values.length,
    truncated: values.length > limit,
  };
}

function formatValueLabel(value: string, column: string): string {
  if (value === EMPTY_VALUE_KEY) return '(Empty)';
  if (value === 'true') return 'Yes';
  if (value === 'false') return 'No';

  if (['availability', 'condition', 'gender', 'age_group'].includes(column)) {
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase().replace(/_/g, ' ');
  }
  return value;
}

export async function countProductsByItemGroupId(shopId: string, itemGroupId: string): Promise<number> {
  const whereClause = await buildItemGroupWhereClause(shopId, itemGroupId);
  const result = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*) as count FROM "Product" WHERE ${whereClause}`
  );
  return Number(result[0]?.count || 0);
}

export async function getProductIdsByItemGroupId(shopId: string, itemGroupId: string): Promise<string[]> {
  const whereClause = await buildItemGroupWhereClause(shopId, itemGroupId);
  const products = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT "id" FROM "Product" WHERE ${whereClause}`
  );
  return products.map(p => p.id);
}

async function buildItemGroupWhereClause(shopId: string, itemGroupId: string): Promise<string> {
  const parentIds = await getParentProductIds(shopId);
  return [
    `"shop_id" = '${escapeSqlString(shopId)}'`,
    `"woo_product_id" NOT IN (${parentIds.length > 0 ? parentIds.join(',') : '0'})`,
    `"openai_auto_filled"->>'item_group_id' = '${escapeSqlString(itemGroupId)}'`
  ].join(' AND ');
}

export function transformWooProduct(woo: any) {
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
    checksum: checksum(woo),
    updatedAt: new Date(),
  };
}

/**
 * Merges parent variable product data with variation data.
 * Parent fields serve as defaults; variation fields override when non-empty.
 */
export function mergeParentAndVariation(parent: any, variation: any) {
  const varAttrs = extractVariationAttributes(variation);
  const mergedImages = mergeImages(parent, variation);
  const dimensions = mergeDimensions(parent, variation);
  const mergedAttributes = mergeAttributes(parent, variation, varAttrs);

  const merged: any = { ...parent };

  // Override with non-empty variation primitive fields
  for (const [key, value] of Object.entries(variation)) {
    if (typeof value !== 'object' && !isEmpty(value)) {
      merged[key] = value;
    }
  }

  // Apply special field handling
  Object.assign(merged, {
    id: variation.id,
    parent_id: parent.id,
    sku: variation.sku || parent.sku || '',
    permalink: variation.permalink || parent.permalink,
    stock_status: variation.stock_status || '',
    stock_quantity: variation.stock_quantity ?? null,
    manage_stock: variation.manage_stock ?? parent.manage_stock ?? false,
    price: variation.price || parent.price || '',
    regular_price: variation.regular_price || parent.regular_price || '',
    sale_price: variation.sale_price || parent.sale_price || '',
    weight: mergeWithFallback(variation.weight, parent.weight) || '',
    dimensions,
    images: mergedImages,
    attributes: mergedAttributes,
    meta_data: mergeMetaData(parent, variation),
    categories: parent.categories || [],
    tags: parent.tags || [],
    brands: parent.brands || [],
    date_modified: variation.date_modified || parent.date_modified,
    name: parent.name && variation.name ? `${parent.name} - ${variation.name}` : merged.name,
  });

  return transformWooProduct(merged);
}

function isEmpty(val: any): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === 'string' && val.trim() === '') return true;
  if (Array.isArray(val) && val.length === 0) return true;
  return false;
}

function mergeWithFallback(variationVal: any, parentVal: any): any {
  return (variationVal && variationVal !== parentVal) ? variationVal : parentVal;
}

function extractVariationAttributes(variation: any): Record<string, string> {
  return (variation.attributes || []).reduce((acc: Record<string, string>, attr: any) => {
    acc[attr.name.toLowerCase()] = attr.option;
    return acc;
  }, {});
}

function mergeImages(parent: any, variation: any): any[] {
  const variationImage = variation.image?.src ? [variation.image] : [];
  return [...variationImage, ...(parent.images || [])];
}

function mergeDimensions(parent: any, variation: any): Record<string, string> {
  const parentDims = parent.dimensions || {};
  const varDims = variation.dimensions || {};
  return {
    length: mergeWithFallback(varDims.length, parentDims.length) || '',
    width: mergeWithFallback(varDims.width, parentDims.width) || '',
    height: mergeWithFallback(varDims.height, parentDims.height) || '',
  };
}

function mergeMetaData(parent: any, variation: any): any[] {
  const parentMeta = parent.meta_data || [];
  const variationMeta = variation.meta_data || [];
  const variationMetaKeys = new Set(variationMeta.map((m: any) => m.key));
  return [
    ...parentMeta.filter((m: any) => !variationMetaKeys.has(m.key)),
    ...variationMeta,
  ];
}

function mergeAttributes(parent: any, variation: any, varAttrs: Record<string, string>): any[] {
  const SKIP_ATTRS = new Set(['color', 'colour', 'size']);
  const merged: any[] = [];
  const addedNames = new Set<string>();

  // Convert parent attributes to variation format
  for (const attr of parent.attributes || []) {
    const attrName = attr.name.toLowerCase();
    if (SKIP_ATTRS.has(attrName)) continue;
    if (!Array.isArray(attr.options) || attr.options.length === 0) continue;

    const option = varAttrs[attrName] ||
      (attr.options.length === 1 ? attr.options[0] : attr.options.join(', '));

    merged.push({ id: attr.id || 0, name: attr.name, option });
    addedNames.add(attrName);
  }

  // Add color attribute
  const colorValue = varAttrs.color || varAttrs.colour;
  if (colorValue) {
    merged.push({ id: 0, name: 'Color', option: colorValue });
    addedNames.add('color');
    addedNames.add('colour');
  }

  // Add size attribute
  if (varAttrs.size) {
    merged.push({ id: 0, name: 'Size', option: varAttrs.size });
    addedNames.add('size');
  }

  // Add remaining variation-only attributes
  for (const [attrName, attrValue] of Object.entries(varAttrs)) {
    if (addedNames.has(attrName) || !attrValue) continue;
    const originalAttr = variation.attributes?.find((a: any) => a.name.toLowerCase() === attrName);
    merged.push({
      id: originalAttr?.id || 0,
      name: originalAttr?.name || attrName.charAt(0).toUpperCase() + attrName.slice(1),
      option: attrValue,
    });
  }

  return merged;
}
