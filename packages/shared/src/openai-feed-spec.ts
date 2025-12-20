/**
 * OpenAI Product Feed Complete Specification
 *
 * This file defines all 70 OpenAI feed attributes with complete metadata.
 * Based on ProductSynch Technical Specification V2.1
 *
 * Each field includes:
 * - attribute: field name in OpenAI feed
 * - dataType: expected data type
 * - supportedValues: valid values (for enums)
 * - description: what the field represents
 * - example: sample value
 * - requirement: Required/Recommended/Optional/Conditional
 * - dependencies: other fields that must be present
 * - validationRules: validation constraints
 * - wooCommerceMapping: how to extract from WooCommerce data
 * - isLocked: whether the field mapping is locked and cannot be customized by users
 * - category: UI grouping category
 */

export interface OpenAIFieldSpec {
  attribute: string;
  dataType: string;
  supportedValues: string | null;
  description: string;
  example: string;
  requirement: 'Required' | 'Recommended' | 'Optional' | 'Conditional';
  dependencies: string | null;
  validationRules: string[];
  wooCommerceMapping: WooCommerceMapping | null;
  isLocked: boolean;
  category: OpenAIFieldCategory;
}

// Product-level field override types
export type ProductOverrideType = 'mapping' | 'static';

export interface ProductFieldOverride {
  type: ProductOverrideType;
  value: string;
}

export type ProductFieldOverrides = Record<string, ProductFieldOverride>;

export interface WooCommerceMapping {
  field?: string;           // WooCommerce field path (e.g., "name", "price", "meta_data.gtin")
  transform?: string;       // Transform function name
  fallback?: string;        // Fallback field if primary is empty
  shopField?: string;       // Shop-level field (e.g., "sellerName")
}

export type OpenAIFieldCategory =
  | 'flags'
  | 'basic_product_data'
  | 'item_information'
  | 'media'
  | 'price_promotions'
  | 'availability_inventory'
  | 'variants'
  | 'fulfillment'
  | 'merchant_info'
  | 'returns'
  | 'performance_signals'
  | 'compliance'
  | 'reviews_qanda'
  | 'related_products'
  | 'geo_tagging';

export const OPENAI_FEED_SPEC: OpenAIFieldSpec[] = [

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: OPENAI FLAGS
  // ═══════════════════════════════════════════════════════════════════════════

  {
    attribute: 'enable_search',
    dataType: 'Enum',
    supportedValues: 'true, false',
    description: 'Controls whether the product can be surfaced in ChatGPT search results.',
    example: 'true',
    requirement: 'Required',
    dependencies: null,
    validationRules: ['Must be lowercase string "true" or "false"'],
    wooCommerceMapping: null, // User setting only
    isLocked: false,
    category: 'flags',
  },
  {
    attribute: 'enable_checkout',
    dataType: 'Enum',
    supportedValues: 'true, false',
    description: 'Allows direct purchase inside ChatGPT. enable_search must be true for this to work.',
    example: 'true',
    requirement: 'Required',
    dependencies: 'enable_search must be true',
    validationRules: ['Must be lowercase string "true" or "false"'],
    wooCommerceMapping: null, // User setting only
    isLocked: false,
    category: 'flags',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: BASIC PRODUCT DATA
  // ═══════════════════════════════════════════════════════════════════════════

  {
    attribute: 'id',
    dataType: 'String (alphanumeric)',
    supportedValues: null,
    description: 'Merchant product ID (unique). Must remain stable over time.',
    example: 'SKU12345',
    requirement: 'Required',
    dependencies: null,
    validationRules: ['Max 100 characters', 'Must remain stable over time', 'Alphanumeric'],
    wooCommerceMapping: {
      field: 'id',
    },
    isLocked: true,
    category: 'basic_product_data',
  },
  {
    attribute: 'gtin',
    dataType: 'String (numeric)',
    supportedValues: 'GTIN, UPC, ISBN',
    description: 'Universal product identifier (barcode).',
    example: '123456789543',
    requirement: 'Recommended',
    dependencies: null,
    validationRules: ['8-14 digits', 'No dashes or spaces'],
    wooCommerceMapping: {
      field: 'global_unique_id',
      fallback: 'meta_data',
      transform: 'extractGtin',
    },
    isLocked: true,
    category: 'basic_product_data',
  },
  {
    attribute: 'mpn',
    dataType: 'String (alphanumeric)',
    supportedValues: null,
    description: 'Manufacturer part number.',
    example: 'GPT5',
    requirement: 'Conditional',
    dependencies: 'Required if gtin is not provided',
    validationRules: ['Max 70 characters'],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'basic_product_data',
  },
  {
    attribute: 'title',
    dataType: 'String (UTF-8 text)',
    supportedValues: null,
    description: 'Product title. Avoid all-caps.',
    example: "Men's Trail Running Shoes Black",
    requirement: 'Required',
    dependencies: null,
    validationRules: ['Max 150 characters', 'Avoid ALL CAPS'],
    wooCommerceMapping: {
      field: 'name',
      transform: 'cleanVariationTitle',
    },
    isLocked: true,
    category: 'basic_product_data',
  },
  {
    attribute: 'description',
    dataType: 'String (UTF-8 text)',
    supportedValues: null,
    description: 'Full product description. Plain text only.',
    example: 'Waterproof trail shoe with cushioned sole…',
    requirement: 'Required',
    dependencies: null,
    validationRules: ['Max 5000 characters', 'Plain text only (no HTML)'],
    wooCommerceMapping: {
      field: 'description',
      transform: 'stripHtml',
      fallback: 'short_description',
    },
    isLocked: true,
    category: 'basic_product_data',
  },
  {
    attribute: 'link',
    dataType: 'URL',
    supportedValues: 'e.g. https://example.com/product/SKU12345',
    description: 'Product detail page URL.',
    example: 'https://example.com/product/SKU12345',
    requirement: 'Required',
    dependencies: null,
    validationRules: ['Must resolve with HTTP 200', 'HTTPS preferred'],
    wooCommerceMapping: {
      field: 'permalink',
    },
    isLocked: true,
    category: 'basic_product_data',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: ITEM INFORMATION
  // ═══════════════════════════════════════════════════════════════════════════

  {
    attribute: 'condition',
    dataType: 'Enum',
    supportedValues: 'new, refurbished, used',
    description: 'Condition of product.',
    example: 'new',
    requirement: 'Conditional',
    dependencies: 'Required if product condition differs from new',
    validationRules: ['Must be lowercase string'],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'item_information',
  },
  {
    attribute: 'product_category',
    dataType: 'String',
    supportedValues: 'e.g. Apparel & Accessories > Shoes',
    description: 'Category path using > separator.',
    example: 'Apparel & Accessories > Shoes',
    requirement: 'Required',
    dependencies: null,
    validationRules: ['Use ">" separator between levels'],
    wooCommerceMapping: {
      field: 'categories',
      transform: 'buildCategoryPath',
    },
    isLocked: true,
    category: 'item_information',
  },
  {
    attribute: 'brand',
    dataType: 'String',
    supportedValues: null,
    description: 'Product brand.',
    example: 'OpenAI',
    requirement: 'Conditional',
    dependencies: 'Required for all except movies, books, musical recordings',
    validationRules: ['Max 70 characters'],
    wooCommerceMapping: {
      field: 'brands[0].name',
      fallback: 'attributes.brand',
    },
    isLocked: true,
    category: 'item_information',
  },
  {
    attribute: 'material',
    dataType: 'String',
    supportedValues: null,
    description: 'Primary material(s).',
    example: 'Leather',
    requirement: 'Required',
    dependencies: null,
    validationRules: ['Max 100 characters'],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'item_information',
  },
  {
    attribute: 'dimensions',
    dataType: 'String',
    supportedValues: 'e.g. 12x8x5 in',
    description: 'Overall dimensions.',
    example: '12x8x5 in',
    requirement: 'Optional',
    dependencies: null,
    validationRules: ['Units required if provided'],
    wooCommerceMapping: {
      field: 'dimensions',
      transform: 'formatDimensions',
    },
    isLocked: false,
    category: 'item_information',
  },
  {
    attribute: 'length',
    dataType: 'Number + unit',
    supportedValues: null,
    description: 'Individual length dimension.',
    example: '10 mm',
    requirement: 'Optional',
    dependencies: 'Provide all three (length, width, height) if using individual fields',
    validationRules: ['Units required'],
    wooCommerceMapping: {
      field: 'dimensions.length',
      transform: 'addUnit',
    },
    isLocked: false,
    category: 'item_information',
  },
  {
    attribute: 'width',
    dataType: 'Number + unit',
    supportedValues: null,
    description: 'Individual width dimension.',
    example: '10 mm',
    requirement: 'Optional',
    dependencies: 'Provide all three (length, width, height) if using individual fields',
    validationRules: ['Units required'],
    wooCommerceMapping: {
      field: 'dimensions.width',
      transform: 'addUnit',
    },
    isLocked: false,
    category: 'item_information',
  },
  {
    attribute: 'height',
    dataType: 'Number + unit',
    supportedValues: null,
    description: 'Individual height dimension.',
    example: '10 mm',
    requirement: 'Optional',
    dependencies: 'Provide all three (length, width, height) if using individual fields',
    validationRules: ['Units required'],
    wooCommerceMapping: {
      field: 'dimensions.height',
      transform: 'addUnit',
    },
    isLocked: false,
    category: 'item_information',
  },
  {
    attribute: 'weight',
    dataType: 'Number + unit',
    supportedValues: null,
    description: 'Product weight.',
    example: '1.5 lb',
    requirement: 'Required',
    dependencies: null,
    validationRules: ['Positive number with unit'],
    wooCommerceMapping: {
      field: 'weight',
      transform: 'addWeightUnit',
    },
    isLocked: false,
    category: 'item_information',
  },
  {
    attribute: 'age_group',
    dataType: 'Enum',
    supportedValues: 'newborn, infant, toddler, kids, adult',
    description: 'Target demographic.',
    example: 'adult',
    requirement: 'Optional',
    dependencies: null,
    validationRules: ['Must be lowercase string'],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'item_information',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: MEDIA
  // ═══════════════════════════════════════════════════════════════════════════

  {
    attribute: 'image_link',
    dataType: 'URL',
    supportedValues: 'e.g. https://example.com/image1.jpg',
    description: 'Main product image URL.',
    example: 'https://example.com/image1.jpg',
    requirement: 'Required',
    dependencies: null,
    validationRules: ['JPEG/PNG format', 'HTTPS preferred'],
    wooCommerceMapping: {
      field: 'images[0].src',
    },
    isLocked: true,
    category: 'media',
  },
  {
    attribute: 'additional_image_link',
    dataType: 'URL array',
    supportedValues: 'e.g. https://example.com/image2.jpg,...',
    description: 'Extra product images.',
    example: 'https://example.com/image2.jpg,https://example.com/image3.jpg',
    requirement: 'Optional',
    dependencies: null,
    validationRules: ['Comma-separated or array format'],
    wooCommerceMapping: {
      field: 'images',
      transform: 'extractAdditionalImages',
    },
    isLocked: false,
    category: 'media',
  },
  {
    attribute: 'video_link',
    dataType: 'URL',
    supportedValues: 'e.g. https://youtu.be/12345',
    description: 'Product video.',
    example: 'https://youtu.be/12345',
    requirement: 'Optional',
    dependencies: null,
    validationRules: ['Must be publicly accessible'],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'media',
  },
  {
    attribute: 'model_3d_link',
    dataType: 'URL',
    supportedValues: 'e.g. https://example.com/model.glb',
    description: '3D model URL.',
    example: 'https://example.com/model.glb',
    requirement: 'Optional',
    dependencies: null,
    validationRules: ['GLB/GLTF format preferred'],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'media',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: PRICE & PROMOTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  {
    attribute: 'price',
    dataType: 'Number + currency',
    supportedValues: 'e.g. 79.99 USD',
    description: 'Regular price.',
    example: '79.99 USD',
    requirement: 'Required',
    dependencies: null,
    validationRules: ['Must include ISO 4217 currency code'],
    wooCommerceMapping: {
      field: 'regular_price',
      fallback: 'price',
      transform: 'formatPriceWithCurrency',
    },
    isLocked: false,
    category: 'price_promotions',
  },
  {
    attribute: 'sale_price',
    dataType: 'Number + currency',
    supportedValues: 'e.g. 59.99 USD',
    description: 'Discounted price.',
    example: '59.99 USD',
    requirement: 'Optional',
    dependencies: null,
    validationRules: ['Must be ≤ price', 'Must include currency code'],
    wooCommerceMapping: {
      field: 'sale_price',
      transform: 'formatPriceWithCurrency',
    },
    isLocked: false,
    category: 'price_promotions',
  },
  {
    attribute: 'sale_price_effective_date',
    dataType: 'Date range',
    supportedValues: 'e.g. 2025-07-01 / 2025-07-15',
    description: 'Sale window start and end dates.',
    example: '2025-07-01 / 2025-07-15',
    requirement: 'Optional',
    dependencies: 'Required if sale_price is provided',
    validationRules: ['Start must precede end', 'ISO 8601 format'],
    wooCommerceMapping: {
      field: 'date_on_sale_from',
      transform: 'formatSaleDateRange',
    },
    isLocked: false,
    category: 'price_promotions',
  },
  {
    attribute: 'unit_pricing_measure',
    dataType: 'Number + unit',
    supportedValues: null,
    description: 'Unit price measure.',
    example: '16 oz',
    requirement: 'Optional',
    dependencies: 'Both unit_pricing_measure and unit_pricing_base_measure required together',
    validationRules: [],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'price_promotions',
  },
  {
    attribute: 'unit_pricing_base_measure',
    dataType: 'Number + unit',
    supportedValues: null,
    description: 'Unit price base measure.',
    example: '1 oz',
    requirement: 'Optional',
    dependencies: 'Both fields required together',
    validationRules: [],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'price_promotions',
  },
  {
    attribute: 'pricing_trend',
    dataType: 'String',
    supportedValues: null,
    description: 'Lowest price information.',
    example: 'Lowest price in 6 months',
    requirement: 'Optional',
    dependencies: null,
    validationRules: ['Max 80 characters'],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'price_promotions',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: AVAILABILITY & INVENTORY
  // ═══════════════════════════════════════════════════════════════════════════

  {
    attribute: 'availability',
    dataType: 'Enum',
    supportedValues: 'in_stock, out_of_stock, preorder',
    description: 'Product availability status.',
    example: 'in_stock',
    requirement: 'Required',
    dependencies: null,
    validationRules: ['Must be lowercase string'],
    wooCommerceMapping: {
      field: 'stock_status',
      transform: 'mapStockStatus',
    },
    isLocked: true,
    category: 'availability_inventory',
  },
  {
    attribute: 'availability_date',
    dataType: 'Date',
    supportedValues: 'e.g. 2025-12-01',
    description: 'Availability date if preorder. Must be null if availability is not preorder.',
    example: '2025-12-01',
    requirement: 'Conditional',
    dependencies: 'Required if availability = preorder, must be null otherwise',
    validationRules: ['Must be future date', 'ISO 8601 format', 'Must be null if availability is not preorder'],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'availability_inventory',
  },
  {
    attribute: 'inventory_quantity',
    dataType: 'Integer',
    supportedValues: null,
    description: 'Stock count.',
    example: '25',
    requirement: 'Required',
    dependencies: null,
    validationRules: ['Non-negative integer'],
    wooCommerceMapping: {
      field: 'stock_quantity',
      transform: 'defaultToZero',
    },
    isLocked: true,
    category: 'availability_inventory',
  },
  {
    attribute: 'expiration_date',
    dataType: 'Date',
    supportedValues: 'e.g. 2025-12-01',
    description: 'Remove product after this date.',
    example: '2025-12-01',
    requirement: 'Optional',
    dependencies: null,
    validationRules: ['Must be future date'],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'availability_inventory',
  },
  {
    attribute: 'pickup_method',
    dataType: 'Enum',
    supportedValues: 'in_store, reserve, not_supported',
    description: 'Pickup options.',
    example: 'in_store',
    requirement: 'Optional',
    dependencies: null,
    validationRules: ['Must be lowercase string'],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'availability_inventory',
  },
  {
    attribute: 'pickup_sla',
    dataType: 'Number + duration',
    supportedValues: null,
    description: 'Pickup SLA timeframe.',
    example: '1 day',
    requirement: 'Optional',
    dependencies: 'Requires pickup_method',
    validationRules: ['Positive integer + unit'],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'availability_inventory',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: VARIANTS
  // ═══════════════════════════════════════════════════════════════════════════

  {
    attribute: 'item_group_id',
    dataType: 'String',
    supportedValues: null,
    description: 'Variant group ID. Same value for all variants of a product.',
    example: 'SHOE123GROUP',
    requirement: 'Conditional',
    dependencies: 'Required if variants exist',
    validationRules: ['Max 70 characters'],
    wooCommerceMapping: {
      field: 'parent_id',
      transform: 'generateGroupId',
    },
    isLocked: true,
    category: 'variants',
  },
  {
    attribute: 'item_group_title',
    dataType: 'String (UTF-8 text)',
    supportedValues: null,
    description: 'Group product title.',
    example: "Men's Trail Running Shoes",
    requirement: 'Optional',
    dependencies: null,
    validationRules: ['Max 150 characters', 'Avoid all-caps'],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'variants',
  },
  {
    attribute: 'color',
    dataType: 'String',
    supportedValues: null,
    description: 'Variant color.',
    example: 'Blue',
    requirement: 'Recommended',
    dependencies: 'Recommended for apparel',
    validationRules: ['Max 40 characters'],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'variants',
  },
  {
    attribute: 'size',
    dataType: 'String',
    supportedValues: null,
    description: 'Variant size.',
    example: '10',
    requirement: 'Recommended',
    dependencies: 'Recommended for apparel',
    validationRules: ['Max 20 characters'],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'variants',
  },
  {
    attribute: 'size_system',
    dataType: 'Country code',
    supportedValues: 'e.g. US',
    description: 'Size system.',
    example: 'US',
    requirement: 'Recommended',
    dependencies: 'Recommended for apparel',
    validationRules: ['2-letter country code'],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'variants',
  },
  {
    attribute: 'gender',
    dataType: 'Enum',
    supportedValues: 'male, female, unisex',
    description: 'Gender target.',
    example: 'male',
    requirement: 'Recommended',
    dependencies: 'Recommended for apparel',
    validationRules: ['Must be lowercase string'],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'variants',
  },
  {
    attribute: 'offer_id',
    dataType: 'String',
    supportedValues: null,
    description: 'Offer ID (SKU+seller+price).',
    example: 'SKU12345-Blue-79.99',
    requirement: 'Recommended',
    dependencies: null,
    validationRules: ['Unique within feed'],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'variants',
  },
  {
    attribute: 'custom_variant1_category',
    dataType: 'String',
    supportedValues: null,
    description: 'Custom variant dimension 1 name.',
    example: 'Size_Type',
    requirement: 'Optional',
    dependencies: null,
    validationRules: [],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'variants',
  },
  {
    attribute: 'custom_variant1_option',
    dataType: 'String',
    supportedValues: null,
    description: 'Custom variant 1 option value.',
    example: 'Petite',
    requirement: 'Optional',
    dependencies: null,
    validationRules: [],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'variants',
  },
  {
    attribute: 'custom_variant2_category',
    dataType: 'String',
    supportedValues: null,
    description: 'Custom variant dimension 2 name.',
    example: 'Wood_Type',
    requirement: 'Optional',
    dependencies: null,
    validationRules: [],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'variants',
  },
  {
    attribute: 'custom_variant2_option',
    dataType: 'String',
    supportedValues: null,
    description: 'Custom variant 2 option value.',
    example: 'Oak',
    requirement: 'Optional',
    dependencies: null,
    validationRules: [],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'variants',
  },
  {
    attribute: 'custom_variant3_category',
    dataType: 'String',
    supportedValues: null,
    description: 'Custom variant dimension 3 name.',
    example: 'Cap_Type',
    requirement: 'Optional',
    dependencies: null,
    validationRules: [],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'variants',
  },
  {
    attribute: 'custom_variant3_option',
    dataType: 'String',
    supportedValues: null,
    description: 'Custom variant 3 option value.',
    example: 'Snapback',
    requirement: 'Optional',
    dependencies: null,
    validationRules: [],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'variants',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: FULFILLMENT
  // ═══════════════════════════════════════════════════════════════════════════

  {
    attribute: 'shipping',
    dataType: 'String',
    supportedValues: 'country:region:service_class:price',
    description: 'Shipping method/cost/region.',
    example: 'US:CA:Overnight:16.00 USD',
    requirement: 'Conditional',
    dependencies: 'Required where applicable',
    validationRules: ['Use colon separators', 'Multiple entries allowed'],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'fulfillment',
  },
  {
    attribute: 'delivery_estimate',
    dataType: 'Date',
    supportedValues: 'e.g. 2025-08-12',
    description: 'Estimated arrival date.',
    example: '2025-08-12',
    requirement: 'Optional',
    dependencies: null,
    validationRules: ['Must be future date'],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'fulfillment',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: MERCHANT INFO
  // ═══════════════════════════════════════════════════════════════════════════

  {
    attribute: 'seller_name',
    dataType: 'String',
    supportedValues: null,
    description: 'Seller name.',
    example: 'Example Store',
    requirement: 'Required',
    dependencies: null,
    validationRules: ['Max 70 characters'],
    wooCommerceMapping: {
      shopField: 'sellerName',
      fallback: 'shopName',
    },
    isLocked: false,
    category: 'merchant_info',
  },
  {
    attribute: 'seller_url',
    dataType: 'URL',
    supportedValues: 'e.g. https://example.com/store',
    description: 'Seller page URL.',
    example: 'https://example.com/store',
    requirement: 'Required',
    dependencies: null,
    validationRules: ['HTTPS preferred'],
    wooCommerceMapping: {
      shopField: 'sellerUrl',
      fallback: 'wooStoreUrl',
    },
    isLocked: false,
    category: 'merchant_info',
  },
  {
    attribute: 'seller_privacy_policy',
    dataType: 'URL',
    supportedValues: 'e.g. https://example.com/privacy',
    description: 'Seller-specific privacy policy.',
    example: 'https://example.com/privacy',
    requirement: 'Conditional',
    dependencies: 'Required if enable_checkout is true',
    validationRules: ['HTTPS preferred'],
    wooCommerceMapping: {
      shopField: 'sellerPrivacyPolicy',
    },
    isLocked: false,
    category: 'merchant_info',
  },
  {
    attribute: 'seller_tos',
    dataType: 'URL',
    supportedValues: 'e.g. https://example.com/terms',
    description: 'Seller-specific terms of service.',
    example: 'https://example.com/terms',
    requirement: 'Conditional',
    dependencies: 'Required if enable_checkout is true',
    validationRules: ['HTTPS preferred'],
    wooCommerceMapping: {
      shopField: 'sellerTos',
    },
    isLocked: false,
    category: 'merchant_info',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: RETURNS
  // ═══════════════════════════════════════════════════════════════════════════

  {
    attribute: 'return_policy',
    dataType: 'URL',
    supportedValues: 'e.g. https://example.com/returns',
    description: 'Return policy URL.',
    example: 'https://example.com/returns',
    requirement: 'Required',
    dependencies: null,
    validationRules: ['HTTPS preferred'],
    wooCommerceMapping: {
      shopField: 'returnPolicy',
    },
    isLocked: false,
    category: 'returns',
  },
  {
    attribute: 'return_window',
    dataType: 'Integer',
    supportedValues: 'e.g. 30',
    description: 'Days allowed for return.',
    example: '30',
    requirement: 'Required',
    dependencies: null,
    validationRules: ['Positive integer'],
    wooCommerceMapping: {
      shopField: 'returnWindow',
    },
    isLocked: false,
    category: 'returns',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: PERFORMANCE SIGNALS
  // ═══════════════════════════════════════════════════════════════════════════

  {
    attribute: 'popularity_score',
    dataType: 'Number',
    supportedValues: null,
    description: 'Popularity indicator.',
    example: '4.7',
    requirement: 'Recommended',
    dependencies: null,
    validationRules: ['0-5 scale or merchant-defined'],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'performance_signals',
  },
  {
    attribute: 'return_rate',
    dataType: 'Number',
    supportedValues: 'e.g. 2%',
    description: 'Return rate.',
    example: '2%',
    requirement: 'Recommended',
    dependencies: null,
    validationRules: ['0-100%'],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'performance_signals',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: COMPLIANCE
  // ═══════════════════════════════════════════════════════════════════════════

  {
    attribute: 'warning',
    dataType: 'String',
    supportedValues: null,
    description: 'Product disclaimers or warnings.',
    example: 'Contains lithium battery',
    requirement: 'Recommended',
    dependencies: 'Recommended for Checkout',
    validationRules: [],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'compliance',
  },
  {
    attribute: 'warning_url',
    dataType: 'URL',
    supportedValues: null,
    description: 'URL to warning/disclaimer page.',
    example: 'https://example.com/prop65',
    requirement: 'Optional',
    dependencies: null,
    validationRules: ['If URL, must resolve HTTP 200'],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'compliance',
  },
  {
    attribute: 'age_restriction',
    dataType: 'Number',
    supportedValues: null,
    description: 'Minimum purchase age.',
    example: '21',
    requirement: 'Recommended',
    dependencies: null,
    validationRules: ['Positive integer'],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'compliance',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: REVIEWS AND Q&A
  // ═══════════════════════════════════════════════════════════════════════════

  {
    attribute: 'product_review_count',
    dataType: 'Integer',
    supportedValues: null,
    description: 'Number of product reviews.',
    example: '254',
    requirement: 'Recommended',
    dependencies: null,
    validationRules: ['Non-negative integer'],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'reviews_qanda',
  },
  {
    attribute: 'product_review_rating',
    dataType: 'Number',
    supportedValues: null,
    description: 'Average review score.',
    example: '4.6',
    requirement: 'Recommended',
    dependencies: null,
    validationRules: ['0-5 scale'],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'reviews_qanda',
  },
  {
    attribute: 'store_review_count',
    dataType: 'Integer',
    supportedValues: null,
    description: 'Number of brand/store reviews.',
    example: '2000',
    requirement: 'Optional',
    dependencies: null,
    validationRules: ['Non-negative integer'],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'reviews_qanda',
  },
  {
    attribute: 'store_review_rating',
    dataType: 'Number',
    supportedValues: null,
    description: 'Average store rating.',
    example: '4.8',
    requirement: 'Optional',
    dependencies: null,
    validationRules: ['0-5 scale'],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'reviews_qanda',
  },
  {
    attribute: 'q_and_a',
    dataType: 'String',
    supportedValues: null,
    description: 'FAQ content.',
    example: 'Q: Is this waterproof? A: Yes',
    requirement: 'Recommended',
    dependencies: null,
    validationRules: ['Plain text format'],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'reviews_qanda',
  },
  {
    attribute: 'raw_review_data',
    dataType: 'String',
    supportedValues: null,
    description: 'Raw review payload.',
    example: '{"reviews": [...]}',
    requirement: 'Recommended',
    dependencies: null,
    validationRules: ['May include JSON blob'],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'reviews_qanda',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: RELATED PRODUCTS
  // ═══════════════════════════════════════════════════════════════════════════

  {
    attribute: 'related_product_id',
    dataType: 'String',
    supportedValues: null,
    description: 'Associated product IDs.',
    example: 'SKU67890',
    requirement: 'Recommended',
    dependencies: null,
    validationRules: ['Comma-separated list allowed'],
    wooCommerceMapping: {
      field: 'related_ids',
      transform: 'formatRelatedIds',
      fallback: 'upsell_ids',
    },
    isLocked: false,
    category: 'related_products',
  },
  {
    attribute: 'relationship_type',
    dataType: 'Enum',
    supportedValues: 'part_of_set, required_part, often_bought_with, substitute, different_brand, accessory',
    description: 'Relationship type.',
    example: 'often_bought_with',
    requirement: 'Recommended',
    dependencies: null,
    validationRules: ['Must be lowercase string'],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'related_products',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY: GEO TAGGING
  // ═══════════════════════════════════════════════════════════════════════════

  {
    attribute: 'geo_price',
    dataType: 'Number + currency',
    supportedValues: 'e.g. 79.99 USD (California)',
    description: 'Price by region.',
    example: '79.99 USD (California)',
    requirement: 'Recommended',
    dependencies: null,
    validationRules: ['Must include ISO 4217 currency'],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'geo_tagging',
  },
  {
    attribute: 'geo_availability',
    dataType: 'String',
    supportedValues: 'e.g. in_stock (Texas), out_of_stock (New York)',
    description: 'Availability per region.',
    example: 'in_stock (Texas), out_of_stock (New York)',
    requirement: 'Recommended',
    dependencies: null,
    validationRules: ['Regions must be valid ISO 3166 codes'],
    wooCommerceMapping: null,
    isLocked: false,
    category: 'geo_tagging',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

// Get required fields (17 fields)
export const REQUIRED_FIELDS = OPENAI_FEED_SPEC.filter(f => f.requirement === 'Required');

// Get all locked fields (11 fields) - these mappings cannot be customized by users
export const LOCKED_FIELDS = OPENAI_FEED_SPEC.filter(f => f.isLocked);

// Generate locked field mappings from spec (single source of truth)
export const LOCKED_FIELD_MAPPINGS: Record<string, string> = LOCKED_FIELDS.reduce((acc, field) => {
  // Only include fields that have a simple field mapping (not transform/fallback/shopField)
  if (field.wooCommerceMapping?.field && !field.wooCommerceMapping.shopField) {
    acc[field.attribute] = field.wooCommerceMapping.field;
  }
  return acc;
}, {} as Record<string, string>);

// Set of locked field attributes for quick lookup
export const LOCKED_FIELD_SET = new Set(LOCKED_FIELDS.map(f => f.attribute));

// Locked fields that allow static value overrides at product level
// These are locked for WooCommerce mapping but can have manual static overrides
export const STATIC_OVERRIDE_ALLOWED_LOCKED_FIELDS = new Set(['title', 'description', 'product_category']);

// Get fields by category
export const getFieldsByCategory = (category: OpenAIFieldCategory): OpenAIFieldSpec[] =>
  OPENAI_FEED_SPEC.filter(f => f.category === category);

// Category display order and labels
export const CATEGORY_CONFIG: Record<OpenAIFieldCategory, { label: string; order: number }> = {
  flags: { label: 'OpenAI Flags', order: 1 },
  basic_product_data: { label: 'Basic Product Data', order: 2 },
  item_information: { label: 'Item Information', order: 3 },
  media: { label: 'Media', order: 4 },
  price_promotions: { label: 'Price & Promotions', order: 5 },
  availability_inventory: { label: 'Availability & Inventory', order: 6 },
  variants: { label: 'Variants', order: 7 },
  fulfillment: { label: 'Fulfillment', order: 8 },
  merchant_info: { label: 'Merchant Info', order: 9 },
  returns: { label: 'Returns', order: 10 },
  performance_signals: { label: 'Performance Signals', order: 11 },
  compliance: { label: 'Compliance', order: 12 },
  reviews_qanda: { label: 'Reviews & Q&A', order: 13 },
  related_products: { label: 'Related Products', order: 14 },
  geo_tagging: { label: 'Geo Tagging', order: 15 },
};

// Field count stats
export const FIELD_STATS = {
  total: OPENAI_FEED_SPEC.length,
  required: REQUIRED_FIELDS.length,
  locked: LOCKED_FIELDS.length,
  byCategory: Object.keys(CATEGORY_CONFIG).reduce((acc, cat) => {
    acc[cat as OpenAIFieldCategory] = getFieldsByCategory(cat as OpenAIFieldCategory).length;
    return acc;
  }, {} as Record<OpenAIFieldCategory, number>),
};
