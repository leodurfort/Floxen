import { PrismaClient } from '@prisma/client';
import { OPENAI_FEED_SPEC } from '@productsynch/shared';

const prisma = new PrismaClient();

// WooCommerce fields data (duplicated from apps/web/src/lib/wooCommerceFields.ts)
const WOO_COMMERCE_FIELDS = [
  // Basic Fields
  { value: 'id', label: 'Product ID', category: 'Basic', description: 'WooCommerce product ID' },
  { value: 'name', label: 'Product Name', category: 'Basic', description: 'Product title' },
  { value: 'slug', label: 'Product Slug', category: 'Basic', description: 'URL-friendly name' },
  { value: 'permalink', label: 'Product URL', category: 'Basic', description: 'Direct link to product' },
  { value: 'type', label: 'Product Type', category: 'Basic', description: 'simple, variable, grouped, external' },
  { value: 'status', label: 'Status', category: 'Basic', description: 'publish, draft, pending' },
  { value: 'featured', label: 'Featured Product', category: 'Basic', description: 'true/false' },
  { value: 'catalog_visibility', label: 'Catalog Visibility', category: 'Basic', description: 'visible, catalog, search, hidden' },
  { value: 'description', label: 'Description (Full)', category: 'Basic', description: 'Long description' },
  { value: 'short_description', label: 'Description (Short)', category: 'Basic', description: 'Short summary' },
  { value: 'sku', label: 'SKU', category: 'Basic', description: 'Stock keeping unit' },
  { value: 'menu_order', label: 'Menu Order', category: 'Basic', description: 'Sort order' },
  { value: 'parent_id', label: 'Parent Product ID', category: 'Basic', description: 'For grouped/variations' },

  // Pricing
  { value: 'price', label: 'Price', category: 'Pricing', description: 'Current price' },
  { value: 'regular_price', label: 'Regular Price', category: 'Pricing', description: 'Original price' },
  { value: 'sale_price', label: 'Sale Price', category: 'Pricing', description: 'Discounted price' },
  { value: 'on_sale', label: 'On Sale', category: 'Pricing', description: 'true if product on sale' },
  { value: 'purchasable', label: 'Purchasable', category: 'Pricing', description: 'true if can be purchased' },
  { value: 'total_sales', label: 'Total Sales', category: 'Pricing', description: 'Number of sales' },
  { value: 'date_on_sale_from', label: 'Sale Start Date', category: 'Pricing' },
  { value: 'date_on_sale_to', label: 'Sale End Date', category: 'Pricing' },
  { value: 'date_on_sale_from_gmt', label: 'Sale Start Date (GMT)', category: 'Pricing' },
  { value: 'date_on_sale_to_gmt', label: 'Sale End Date (GMT)', category: 'Pricing' },
  { value: 'tax_status', label: 'Tax Status', category: 'Pricing', description: 'taxable, shipping, none' },
  { value: 'tax_class', label: 'Tax Class', category: 'Pricing' },

  // Inventory
  { value: 'stock_status', label: 'Stock Status', category: 'Inventory', description: 'instock, outofstock, onbackorder' },
  { value: 'stock_quantity', label: 'Stock Quantity', category: 'Inventory', description: 'Number in stock' },
  { value: 'manage_stock', label: 'Manage Stock', category: 'Inventory', description: 'true/false' },
  { value: 'low_stock_amount', label: 'Low Stock Threshold', category: 'Inventory', description: 'Low stock notification threshold' },
  { value: 'sold_individually', label: 'Sold Individually', category: 'Inventory', description: 'Limit purchases to 1 per order' },
  { value: 'backorders', label: 'Backorders Allowed', category: 'Inventory', description: 'no, notify, yes' },
  { value: 'backorders_allowed', label: 'Backorders Status', category: 'Inventory' },
  { value: 'backordered', label: 'Currently Backordered', category: 'Inventory' },

  // Images
  { value: 'images', label: 'All Images (JSON)', category: 'Images', description: 'Array of all images' },
  { value: 'images[0].id', label: 'Main Image ID', category: 'Images' },
  { value: 'images[0].src', label: 'Main Image URL', category: 'Images', description: 'Primary product image' },
  { value: 'images[0].name', label: 'Main Image Name', category: 'Images' },
  { value: 'images[0].alt', label: 'Main Image Alt Text', category: 'Images' },

  // Categories & Tags
  { value: 'categories', label: 'Categories (JSON)', category: 'Taxonomy', description: 'Product categories' },
  { value: 'categories[0].id', label: 'Primary Category ID', category: 'Taxonomy' },
  { value: 'categories[0].name', label: 'Primary Category', category: 'Taxonomy' },
  { value: 'categories[0].slug', label: 'Primary Category Slug', category: 'Taxonomy' },
  { value: 'tags', label: 'Tags (JSON)', category: 'Taxonomy' },
  { value: 'tags[0].id', label: 'Primary Tag ID', category: 'Taxonomy' },
  { value: 'tags[0].name', label: 'Primary Tag', category: 'Taxonomy' },
  { value: 'tags[0].slug', label: 'Primary Tag Slug', category: 'Taxonomy' },

  // Attributes
  { value: 'attributes', label: 'Attributes (JSON)', category: 'Attributes', description: 'All attributes' },
  { value: 'default_attributes', label: 'Default Attributes (JSON)', category: 'Attributes', description: 'Default variation attributes' },

  // Product Types
  { value: 'virtual', label: 'Virtual Product', category: 'Product Types', description: 'true for virtual products' },
  { value: 'downloadable', label: 'Downloadable Product', category: 'Product Types', description: 'true for downloadable products' },
  { value: 'downloads', label: 'Downloads (JSON)', category: 'Product Types', description: 'Downloadable files' },
  { value: 'download_limit', label: 'Download Limit', category: 'Product Types', description: 'Number of downloads allowed' },
  { value: 'download_expiry', label: 'Download Expiry (days)', category: 'Product Types', description: 'Days until download expires' },
  { value: 'external_url', label: 'External URL', category: 'Product Types', description: 'External product URL' },
  { value: 'button_text', label: 'Button Text', category: 'Product Types', description: 'External product button text' },
  { value: 'grouped_products', label: 'Grouped Products (JSON)', category: 'Product Types', description: 'IDs of grouped products' },
  { value: 'variations', label: 'Variations (JSON)', category: 'Product Types', description: 'Variation IDs' },

  // Reviews
  { value: 'reviews_allowed', label: 'Reviews Allowed', category: 'Reviews', description: 'true/false' },
  { value: 'average_rating', label: 'Average Rating', category: 'Reviews', description: 'Average review rating' },
  { value: 'rating_count', label: 'Rating Count', category: 'Reviews', description: 'Number of ratings' },

  // Related Products
  { value: 'related_ids', label: 'Related Product IDs (JSON)', category: 'Related Products' },
  { value: 'upsell_ids', label: 'Upsell Product IDs (JSON)', category: 'Related Products' },
  { value: 'cross_sell_ids', label: 'Cross-sell Product IDs (JSON)', category: 'Related Products' },
  { value: 'purchase_note', label: 'Purchase Note', category: 'Related Products', description: 'Note shown after purchase' },

  // Shipping
  { value: 'weight', label: 'Weight', category: 'Shipping' },
  { value: 'dimensions', label: 'Dimensions (JSON)', category: 'Shipping', description: 'Length, width, height object' },
  { value: 'dimensions.length', label: 'Length', category: 'Shipping' },
  { value: 'dimensions.width', label: 'Width', category: 'Shipping' },
  { value: 'dimensions.height', label: 'Height', category: 'Shipping' },
  { value: 'shipping_class', label: 'Shipping Class', category: 'Shipping' },
  { value: 'shipping_class_id', label: 'Shipping Class ID', category: 'Shipping' },

  // Dates
  { value: 'date_created', label: 'Date Created', category: 'Dates', description: 'Local timezone' },
  { value: 'date_created_gmt', label: 'Date Created (GMT)', category: 'Dates' },
  { value: 'date_modified', label: 'Date Modified', category: 'Dates', description: 'Local timezone' },
  { value: 'date_modified_gmt', label: 'Date Modified (GMT)', category: 'Dates' },

  // Brand (if using brand plugin - commonly available via third-party plugins)
  { value: 'brands[0].name', label: 'Brand Name', category: 'Brand' },
  { value: 'brands', label: 'All Brands (JSON)', category: 'Brand', description: 'All product brands' },

  // Note: Custom meta_data fields (like _gtin, _material, _condition, etc.) are shop-specific
  // and will be discovered dynamically via the field discovery feature.
  // Use POST /api/v1/shops/:id/discover-fields to find meta_data keys in your products.
];

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  console.log('Clearing existing field mappings, woocommerce fields, and openai fields...');
  await prisma.fieldMapping.deleteMany();
  await prisma.wooCommerceField.deleteMany();
  await prisma.openAIField.deleteMany();

  // Seed OpenAI Fields
  console.log(`Seeding ${OPENAI_FEED_SPEC.length} OpenAI fields...`);
  for (const spec of OPENAI_FEED_SPEC) {
    await prisma.openAIField.create({
      data: {
        attribute: spec.attribute,
        label: spec.attribute.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        description: spec.description,
        requirement: spec.requirement,
        example: spec.example,
      },
    });
  }
  console.log(`✅ Created ${OPENAI_FEED_SPEC.length} OpenAI fields`);

  // Seed WooCommerce Fields
  console.log(`Seeding ${WOO_COMMERCE_FIELDS.length} WooCommerce fields...`);
  for (const field of WOO_COMMERCE_FIELDS) {
    await prisma.wooCommerceField.create({
      data: {
        value: field.value,
        label: field.label,
        description: field.description || null,
        category: field.category,
      },
    });
  }
  console.log(`✅ Created ${WOO_COMMERCE_FIELDS.length} WooCommerce fields`);

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
