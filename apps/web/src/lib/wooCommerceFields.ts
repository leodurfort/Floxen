export interface WooCommerceField {
  value: string;           // Field path (e.g., "name", "meta_data._gtin")
  label: string;           // Display name
  category: string;        // Grouping category
  description?: string;    // Field description
}

export const WOO_COMMERCE_FIELDS: WooCommerceField[] = [
  // Basic Fields
  { value: 'id', label: 'Product ID', category: 'Basic', description: 'WooCommerce product ID' },
  { value: 'name', label: 'Product Name', category: 'Basic', description: 'Product title' },
  { value: 'slug', label: 'Product Slug', category: 'Basic', description: 'URL-friendly name' },
  { value: 'permalink', label: 'Product URL', category: 'Basic', description: 'Direct link to product' },
  { value: 'type', label: 'Product Type', category: 'Basic', description: 'simple, variable, grouped' },
  { value: 'status', label: 'Status', category: 'Basic', description: 'publish, draft, pending' },
  { value: 'description', label: 'Description (Full)', category: 'Basic', description: 'Long description' },
  { value: 'short_description', label: 'Description (Short)', category: 'Basic', description: 'Short summary' },
  { value: 'sku', label: 'SKU', category: 'Basic', description: 'Stock keeping unit' },

  // Pricing
  { value: 'price', label: 'Price', category: 'Pricing', description: 'Current price' },
  { value: 'regular_price', label: 'Regular Price', category: 'Pricing', description: 'Original price' },
  { value: 'sale_price', label: 'Sale Price', category: 'Pricing', description: 'Discounted price' },
  { value: 'date_on_sale_from', label: 'Sale Start Date', category: 'Pricing' },
  { value: 'date_on_sale_to', label: 'Sale End Date', category: 'Pricing' },
  { value: 'tax_status', label: 'Tax Status', category: 'Pricing' },
  { value: 'tax_class', label: 'Tax Class', category: 'Pricing' },

  // Inventory
  { value: 'stock_status', label: 'Stock Status', category: 'Inventory', description: 'instock, outofstock' },
  { value: 'stock_quantity', label: 'Stock Quantity', category: 'Inventory', description: 'Number in stock' },
  { value: 'manage_stock', label: 'Manage Stock', category: 'Inventory', description: 'true/false' },
  { value: 'backorders', label: 'Backorders Allowed', category: 'Inventory' },
  { value: 'backorders_allowed', label: 'Backorders Status', category: 'Inventory' },
  { value: 'backordered', label: 'Currently Backordered', category: 'Inventory' },

  // Images
  { value: 'images[0].src', label: 'Main Image URL', category: 'Images', description: 'Primary product image' },
  { value: 'images[0].alt', label: 'Main Image Alt Text', category: 'Images' },
  { value: 'images', label: 'All Images (JSON)', category: 'Images', description: 'Array of all images' },

  // Categories & Tags
  { value: 'categories', label: 'Categories (JSON)', category: 'Taxonomy', description: 'Product categories' },
  { value: 'categories[0].name', label: 'Primary Category', category: 'Taxonomy' },
  { value: 'tags', label: 'Tags (JSON)', category: 'Taxonomy' },

  // Attributes
  { value: 'attributes', label: 'Attributes (JSON)', category: 'Attributes', description: 'All attributes' },

  // Shipping
  { value: 'weight', label: 'Weight', category: 'Shipping' },
  { value: 'dimensions.length', label: 'Length', category: 'Shipping' },
  { value: 'dimensions.width', label: 'Width', category: 'Shipping' },
  { value: 'dimensions.height', label: 'Height', category: 'Shipping' },
  { value: 'shipping_class', label: 'Shipping Class', category: 'Shipping' },

  // Dates
  { value: 'date_created', label: 'Date Created', category: 'Dates' },
  { value: 'date_modified', label: 'Date Modified', category: 'Dates' },

  // Meta Data (Common)
  { value: 'meta_data._gtin', label: 'GTIN (Meta)', category: 'Product IDs', description: 'Global trade item number' },
  { value: 'meta_data._upc', label: 'UPC (Meta)', category: 'Product IDs' },
  { value: 'meta_data._ean', label: 'EAN (Meta)', category: 'Product IDs' },
  { value: 'meta_data._isbn', label: 'ISBN (Meta)', category: 'Product IDs' },
  { value: 'meta_data._mpn', label: 'MPN (Meta)', category: 'Product IDs', description: 'Manufacturer part number' },
  { value: 'meta_data._material', label: 'Material (Meta)', category: 'Details' },
  { value: 'meta_data._condition', label: 'Condition (Meta)', category: 'Details', description: 'new, refurbished, used' },
  { value: 'meta_data._age_group', label: 'Age Group (Meta)', category: 'Details' },
  { value: 'meta_data._gender', label: 'Gender (Meta)', category: 'Details' },
  { value: 'meta_data._size_system', label: 'Size System (Meta)', category: 'Details' },
  { value: 'meta_data._video_url', label: 'Video URL (Meta)', category: 'Media' },
  { value: 'meta_data._3d_model', label: '3D Model (Meta)', category: 'Media' },
  { value: 'meta_data._availability_date', label: 'Availability Date (Meta)', category: 'Availability' },
  { value: 'meta_data._delivery_estimate', label: 'Delivery Estimate (Meta)', category: 'Shipping' },
  { value: 'meta_data._pickup_method', label: 'Pickup Method (Meta)', category: 'Shipping' },
  { value: 'meta_data._pickup_sla', label: 'Pickup SLA (Meta)', category: 'Shipping' },

  // Brand (if using brand plugin)
  { value: 'brands[0].name', label: 'Brand Name', category: 'Brand' },
  { value: 'brands[0].slug', label: 'Brand Slug', category: 'Brand' },

  // Shop-Level Fields (special prefix)
  { value: 'shop.sellerName', label: 'Shop: Seller Name', category: 'Shop Settings', description: 'From shop settings' },
  { value: 'shop.sellerUrl', label: 'Shop: Seller URL', category: 'Shop Settings' },
  { value: 'shop.sellerPrivacyPolicy', label: 'Shop: Privacy Policy', category: 'Shop Settings' },
  { value: 'shop.sellerTos', label: 'Shop: Terms of Service', category: 'Shop Settings' },
  { value: 'shop.returnPolicy', label: 'Shop: Return Policy', category: 'Shop Settings' },
  { value: 'shop.returnWindow', label: 'Shop: Return Window (days)', category: 'Shop Settings' },
  { value: 'shop.shopCurrency', label: 'Shop: Currency', category: 'Shop Settings' },
];

/**
 * Search and filter WooCommerce fields
 */
export function searchWooFields(query: string): WooCommerceField[] {
  const lowerQuery = query.toLowerCase();
  return WOO_COMMERCE_FIELDS.filter(
    (field) =>
      field.label.toLowerCase().includes(lowerQuery) ||
      field.value.toLowerCase().includes(lowerQuery) ||
      field.description?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get field by value
 */
export function getWooField(value: string): WooCommerceField | undefined {
  return WOO_COMMERCE_FIELDS.find((f) => f.value === value);
}
