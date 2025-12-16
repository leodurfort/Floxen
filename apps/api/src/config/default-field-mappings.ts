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
 */

export const DEFAULT_FIELD_MAPPINGS: Record<string, string | null> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // OPENAI FLAGS - No mapping (user settings only)
  // ═══════════════════════════════════════════════════════════════════════════
  enable_search: null,
  enable_checkout: null,

  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC PRODUCT DATA
  // ═══════════════════════════════════════════════════════════════════════════
  id: 'id',
  gtin: null, // Discovered dynamically per shop (meta_data._gtin)
  mpn: 'sku',
  title: 'name',
  description: 'description',
  product_category: 'categories[0].name',
  product_type: null,
  brand: 'brands[0].name',

  // ═══════════════════════════════════════════════════════════════════════════
  // ITEM INFORMATION
  // ═══════════════════════════════════════════════════════════════════════════
  color: null,
  size: null,
  gender: null,
  age_group: null,
  material: null,
  pattern: null,
  condition: null, // Discovered dynamically (meta_data._condition)

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIA
  // ═══════════════════════════════════════════════════════════════════════════
  image_link: 'images[0].src',
  additional_image_link: null,
  video_link: null,

  // ═══════════════════════════════════════════════════════════════════════════
  // PRICE & PROMOTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  price: 'price',
  sale_price: 'sale_price',
  sale_price_effective_date: null,
  unit_pricing_measure: null,
  unit_pricing_base_measure: null,
  installment: null,
  subscription_cost: null,

  // ═══════════════════════════════════════════════════════════════════════════
  // AVAILABILITY & INVENTORY
  // ═══════════════════════════════════════════════════════════════════════════
  availability: 'stock_status',
  availability_date: null,
  quantity: 'stock_quantity',
  sell_on_google_quantity: null,
  min_handling_time: null,
  max_handling_time: null,
  min_order_quantity: null,
  multipack: null,
  is_bundle: null,

  // ═══════════════════════════════════════════════════════════════════════════
  // VARIANTS (for variable products)
  // ═══════════════════════════════════════════════════════════════════════════
  item_group_id: null,
  size_type: null,
  size_system: null,

  // ═══════════════════════════════════════════════════════════════════════════
  // FULFILLMENT
  // ═══════════════════════════════════════════════════════════════════════════
  shipping: null,
  shipping_label: null,
  shipping_weight: 'weight',
  shipping_length: 'dimensions.length',
  shipping_width: 'dimensions.width',
  shipping_height: 'dimensions.height',
  max_handling_time_days: null,
  min_handling_time_days: null,
  pickup_method: null,
  pickup_sla: null,
  link_template: null,
  mobile_link_template: null,

  // ═══════════════════════════════════════════════════════════════════════════
  // MERCHANT INFO (from Shop table)
  // ═══════════════════════════════════════════════════════════════════════════
  seller_name: 'shop.sellerName',
  seller_url: 'shop.sellerUrl',

  // ═══════════════════════════════════════════════════════════════════════════
  // RETURNS
  // ═══════════════════════════════════════════════════════════════════════════
  return_policy_label: null,
  return_address_label: null,

  // ═══════════════════════════════════════════════════════════════════════════
  // PERFORMANCE SIGNALS
  // ═══════════════════════════════════════════════════════════════════════════
  product_weight: 'weight',
  ads_redirect: null,
  cost_of_goods_sold: null,

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLIANCE
  // ═══════════════════════════════════════════════════════════════════════════
  energy_efficiency_class: null,
  min_energy_efficiency_class: null,
  max_energy_efficiency_class: null,
  adult: null,
  age_restricted: null,

  // ═══════════════════════════════════════════════════════════════════════════
  // REVIEWS & Q&A
  // ═══════════════════════════════════════════════════════════════════════════
  product_review: null,
  product_rating: 'average_rating',
  product_review_count: 'rating_count',
  q_and_a: null,

  // ═══════════════════════════════════════════════════════════════════════════
  // RELATED PRODUCTS
  // ═══════════════════════════════════════════════════════════════════════════
  related_products: 'related_ids',

  // ═══════════════════════════════════════════════════════════════════════════
  // GEO-TAGGING
  // ═══════════════════════════════════════════════════════════════════════════
  store_code: null,
};
