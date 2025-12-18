/**
 * Field mappings that must remain fixed in the UI and API.
 * Map of OpenAI attribute -> WooCommerce field path.
 */
export const LOCKED_FIELD_MAPPINGS: Record<string, string> = {
  id: 'id',
  gtin: 'global_unique_id',
  title: 'name',
  description: 'description',
  link: 'permalink',
  product_category: 'categories',
  brand: 'categories',
  image_link: 'images[0].src',
  availability: 'stock_status',
  inventory_quantity: 'stock_quantity',
  item_group_id: 'parent_id',
};

export const LOCKED_FIELD_SET = new Set(Object.keys(LOCKED_FIELD_MAPPINGS));
