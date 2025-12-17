/**
 * Default Field Mappings
 *
 * Simple mapping between OpenAI Product Feed attributes and WooCommerce fields.
 * These are suggested default mappings used when a shop has no custom mappings yet.
 *
 * Format:
 * - Product fields: direct WooCommerce field value (e.g., 'name', 'price', 'sku')
 * - Shop fields: prefixed with 'shop.' (e.g., 'shop.sellerName')
 * - Unmapped fields: null
 *
 * All WooCommerce field values must exist in the woocommerce_fields table.
 *
 * ✅ This file contains EXACTLY 70 fields matching the official OpenAI Product Feed Specification
 */

export const DEFAULT_FIELD_MAPPINGS: Record<string, string | null> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // OPENAI FLAGS (2 fields)
  // ═══════════════════════════════════════════════════════════════════════════
  enable_search: null,
  enable_checkout: null,

  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC PRODUCT DATA (6 fields)
  // ═══════════════════════════════════════════════════════════════════════════
  id: 'id',
  gtin: 'global_unique_id', // Standard WooCommerce field for GTIN/UPC/EAN/ISBN
  mpn: null, // Manufacturer Part Number - typically in meta_data, discover via field discovery
  title: 'name',
  description: 'description',
  link: 'permalink',

  // ═══════════════════════════════════════════════════════════════════════════
  // ITEM INFORMATION (10 fields)
  // ═══════════════════════════════════════════════════════════════════════════
  condition: null, // Discovered dynamically via field discovery (e.g., meta_data._condition)
  product_category: 'categories[0].name',
  brand: 'brands[0].name', // If brand plugin enabled, otherwise use field discovery
  material: null, // Discovered dynamically via field discovery (e.g., meta_data._material)
  dimensions: null, // Use specific dimension fields below instead
  length: 'dimensions.length',
  width: 'dimensions.width',
  height: 'dimensions.height',
  weight: 'weight',
  age_group: null, // Discovered dynamically via field discovery (e.g., meta_data._age_group)

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIA (4 fields)
  // ═══════════════════════════════════════════════════════════════════════════
  image_link: 'images[0].src',
  additional_image_link: null,
  video_link: null,
  model_3d_link: null,

  // ═══════════════════════════════════════════════════════════════════════════
  // PRICE & PROMOTIONS (6 fields)
  // ═══════════════════════════════════════════════════════════════════════════
  price: 'price',
  sale_price: 'sale_price',
  sale_price_effective_date: null,
  unit_pricing_measure: null,
  unit_pricing_base_measure: null,
  pricing_trend: null,

  // ═══════════════════════════════════════════════════════════════════════════
  // AVAILABILITY & INVENTORY (6 fields)
  // ═══════════════════════════════════════════════════════════════════════════
  availability: 'stock_status',
  availability_date: null,
  inventory_quantity: 'stock_quantity',
  expiration_date: null,
  pickup_method: null,
  pickup_sla: null,

  // ═══════════════════════════════════════════════════════════════════════════
  // VARIANTS (13 fields)
  // ═══════════════════════════════════════════════════════════════════════════
  item_group_id: null,
  item_group_title: null,
  color: null,
  size: null,
  size_system: null,
  gender: null,
  offer_id: null,
  custom_variant1_category: null,
  custom_variant1_option: null,
  custom_variant2_category: null,
  custom_variant2_option: null,
  custom_variant3_category: null,
  custom_variant3_option: null,

  // ═══════════════════════════════════════════════════════════════════════════
  // FULFILLMENT (2 fields)
  // ═══════════════════════════════════════════════════════════════════════════
  shipping: null,
  delivery_estimate: null,

  // ═══════════════════════════════════════════════════════════════════════════
  // MERCHANT INFO (4 fields)
  // ═══════════════════════════════════════════════════════════════════════════
  seller_name: 'shop.sellerName',
  seller_url: 'shop.sellerUrl',
  seller_privacy_policy: 'shop.sellerPrivacyPolicy',
  seller_tos: 'shop.sellerTos',

  // ═══════════════════════════════════════════════════════════════════════════
  // RETURNS (2 fields)
  // ═══════════════════════════════════════════════════════════════════════════
  return_policy: 'shop.returnPolicy',
  return_window: 'shop.returnWindow',

  // ═══════════════════════════════════════════════════════════════════════════
  // PERFORMANCE SIGNALS (2 fields)
  // ═══════════════════════════════════════════════════════════════════════════
  popularity_score: null,
  return_rate: null,

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLIANCE (3 fields)
  // ═══════════════════════════════════════════════════════════════════════════
  warning: null,
  warning_url: null,
  age_restriction: null,

  // ═══════════════════════════════════════════════════════════════════════════
  // REVIEWS & Q&A (6 fields)
  // ═══════════════════════════════════════════════════════════════════════════
  product_review_count: 'rating_count',
  product_review_rating: 'average_rating',
  store_review_count: null,
  store_review_rating: null,
  q_and_a: null,
  raw_review_data: null,

  // ═══════════════════════════════════════════════════════════════════════════
  // RELATED PRODUCTS (2 fields)
  // ═══════════════════════════════════════════════════════════════════════════
  related_product_id: 'related_ids',
  relationship_type: null,

  // ═══════════════════════════════════════════════════════════════════════════
  // GEO TAGGING (2 fields)
  // ═══════════════════════════════════════════════════════════════════════════
  geo_price: null,
  geo_availability: null,
};
