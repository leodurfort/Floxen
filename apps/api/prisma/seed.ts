import { PrismaClient } from '@prisma/client';
import { OPENAI_FEED_SPEC } from '@productsynch/shared';
import { SHOP_FIELDS } from '../src/config/shop-fields';

const prisma = new PrismaClient();

/**
 * Official WooCommerce REST API Product Fields
 * Source: https://woocommerce.github.io/woocommerce-rest-api-docs/#product-properties
 *
 * These are the standard fields returned by the WooCommerce REST API v3.
 * Custom meta_data fields are shop-specific and discovered dynamically via field discovery.
 */
const WOO_COMMERCE_FIELDS = [
  // Basic Product Information
  { value: 'id', label: 'Product ID', category: 'Basic', description: 'Unique identifier for the product' },
  { value: 'name', label: 'Product Name', category: 'Basic', description: 'Product name/title' },
  { value: 'slug', label: 'Product Slug', category: 'Basic', description: 'Product slug (URL-friendly name)' },
  { value: 'permalink', label: 'Product URL', category: 'Basic', description: 'Product permalink (full URL)' },
  { value: 'date_created', label: 'Date Created', category: 'Basic', description: 'Date created (local time)' },
  { value: 'date_created_gmt', label: 'Date Created (GMT)', category: 'Basic', description: 'Date created (GMT)' },
  { value: 'date_modified', label: 'Date Modified', category: 'Basic', description: 'Date modified (local time)' },
  { value: 'date_modified_gmt', label: 'Date Modified (GMT)', category: 'Basic', description: 'Date modified (GMT)' },
  { value: 'type', label: 'Product Type', category: 'Basic', description: 'Product type: simple, grouped, external, variable' },
  { value: 'status', label: 'Status', category: 'Basic', description: 'Product status: draft, pending, private, publish' },
  { value: 'featured', label: 'Featured', category: 'Basic', description: 'Featured product (true/false)' },
  { value: 'catalog_visibility', label: 'Catalog Visibility', category: 'Basic', description: 'Catalog visibility: visible, catalog, search, hidden' },
  { value: 'description', label: 'Description (Full)', category: 'Basic', description: 'Product long description (HTML)' },
  { value: 'short_description', label: 'Description (Short)', category: 'Basic', description: 'Product short description (HTML)' },
  { value: 'sku', label: 'SKU', category: 'Basic', description: 'Stock keeping unit' },
  { value: 'global_unique_id', label: 'Global Unique ID', category: 'Basic', description: 'GTIN, UPC, EAN, or ISBN' },

  // Pricing
  { value: 'regular_price', label: 'Regular Price', category: 'Pricing', description: 'Regular price (string)' },
  { value: 'sale_price', label: 'Sale Price', category: 'Pricing', description: 'Sale price (string)' },
  { value: 'on_sale', label: 'On Sale', category: 'Pricing', description: 'On sale status (true/false)' },
  { value: 'purchasable', label: 'Purchasable', category: 'Pricing', description: 'Can be purchased (true/false)' },
  { value: 'total_sales', label: 'Total Sales', category: 'Pricing', description: 'Number of times product has been sold' },
  { value: 'date_on_sale_from', label: 'Sale Start Date', category: 'Pricing', description: 'Sale start date (local time)' },
  { value: 'date_on_sale_from_gmt', label: 'Sale Start Date (GMT)', category: 'Pricing', description: 'Sale start date (GMT)' },
  { value: 'date_on_sale_to', label: 'Sale End Date', category: 'Pricing', description: 'Sale end date (local time)' },
  { value: 'date_on_sale_to_gmt', label: 'Sale End Date (GMT)', category: 'Pricing', description: 'Sale end date (GMT)' },

  // Tax
  { value: 'tax_status', label: 'Tax Status', category: 'Tax', description: 'Tax status: taxable, shipping, none' },
  { value: 'tax_class', label: 'Tax Class', category: 'Tax', description: 'Tax class' },

  // Inventory
  { value: 'manage_stock', label: 'Manage Stock', category: 'Inventory', description: 'Stock management enabled (true/false)' },
  { value: 'stock_quantity', label: 'Stock Quantity', category: 'Inventory', description: 'Stock quantity (integer)' },
  { value: 'stock_status', label: 'Stock Status', category: 'Inventory', description: 'Stock status: instock, outofstock, onbackorder' },
  { value: 'backorders', label: 'Backorders', category: 'Inventory', description: 'Backorders: no, notify, yes' },
  { value: 'backorders_allowed', label: 'Backorders Allowed', category: 'Inventory', description: 'Can be backordered (true/false)' },
  { value: 'backordered', label: 'Backordered', category: 'Inventory', description: 'Is on backorder (true/false)' },
  { value: 'low_stock_amount', label: 'Low Stock Amount', category: 'Inventory', description: 'Low stock threshold' },
  { value: 'sold_individually', label: 'Sold Individually', category: 'Inventory', description: 'Allow one item per order (true/false)' },

  // Shipping
  { value: 'weight', label: 'Weight', category: 'Shipping', description: 'Product weight (string)' },
  { value: 'dimensions', label: 'Dimensions (Object)', category: 'Shipping', description: 'Product dimensions object' },
  { value: 'dimensions.length', label: 'Length', category: 'Shipping', description: 'Product length' },
  { value: 'dimensions.width', label: 'Width', category: 'Shipping', description: 'Product width' },
  { value: 'dimensions.height', label: 'Height', category: 'Shipping', description: 'Product height' },
  { value: 'shipping_required', label: 'Shipping Required', category: 'Shipping', description: 'Requires shipping (true/false)' },
  { value: 'shipping_taxable', label: 'Shipping Taxable', category: 'Shipping', description: 'Shipping is taxable (true/false)' },
  { value: 'shipping_class', label: 'Shipping Class', category: 'Shipping', description: 'Shipping class slug' },
  { value: 'shipping_class_id', label: 'Shipping Class ID', category: 'Shipping', description: 'Shipping class ID' },

  // Reviews
  { value: 'reviews_allowed', label: 'Reviews Allowed', category: 'Reviews', description: 'Reviews allowed (true/false)' },
  { value: 'average_rating', label: 'Average Rating', category: 'Reviews', description: 'Average rating (string)' },
  { value: 'rating_count', label: 'Rating Count', category: 'Reviews', description: 'Number of ratings (integer)' },

  // Related Products
  { value: 'related_ids', label: 'Related Product IDs', category: 'Related Products', description: 'Array of related product IDs' },
  { value: 'upsell_ids', label: 'Upsell Product IDs', category: 'Related Products', description: 'Array of upsell product IDs' },
  { value: 'cross_sell_ids', label: 'Cross-sell Product IDs', category: 'Related Products', description: 'Array of cross-sell product IDs' },
  { value: 'parent_id', label: 'Parent Product ID', category: 'Related Products', description: 'Parent product ID (for variations/grouped)' },

  // Purchase Note
  { value: 'purchase_note', label: 'Purchase Note', category: 'Basic', description: 'Note shown after purchase' },

  // Categories & Tags
  { value: 'categories', label: 'Categories (Array)', category: 'Taxonomy', description: 'Array of category objects' },
  { value: 'categories[0].id', label: 'Primary Category ID', category: 'Taxonomy', description: 'Primary category ID' },
  { value: 'categories[0].name', label: 'Primary Category Name', category: 'Taxonomy', description: 'Primary category name' },
  { value: 'categories[0].slug', label: 'Primary Category Slug', category: 'Taxonomy', description: 'Primary category slug' },
  { value: 'tags', label: 'Tags (Array)', category: 'Taxonomy', description: 'Array of tag objects' },
  { value: 'tags[0].id', label: 'Primary Tag ID', category: 'Taxonomy', description: 'Primary tag ID' },
  { value: 'tags[0].name', label: 'Primary Tag Name', category: 'Taxonomy', description: 'Primary tag name' },
  { value: 'tags[0].slug', label: 'Primary Tag Slug', category: 'Taxonomy', description: 'Primary tag slug' },

  // Images
  { value: 'images', label: 'Images (Array)', category: 'Images', description: 'Array of image objects' },
  { value: 'images[0].id', label: 'Main Image ID', category: 'Images', description: 'Main image ID' },
  { value: 'images[0].src', label: 'Main Image URL', category: 'Images', description: 'Main image source URL' },
  { value: 'images[0].name', label: 'Main Image Name', category: 'Images', description: 'Main image name' },
  { value: 'images[0].alt', label: 'Main Image Alt Text', category: 'Images', description: 'Main image alt text' },

  // Attributes
  { value: 'attributes', label: 'Attributes (Array)', category: 'Attributes', description: 'Array of attribute objects' },
  { value: 'default_attributes', label: 'Default Attributes (Array)', category: 'Attributes', description: 'Default variation attributes' },

  // Variations
  { value: 'variations', label: 'Variation IDs (Array)', category: 'Variations', description: 'Array of variation IDs' },
  { value: 'grouped_products', label: 'Grouped Product IDs (Array)', category: 'Variations', description: 'Array of grouped product IDs' },

  // Menu Order
  { value: 'menu_order', label: 'Menu Order', category: 'Basic', description: 'Menu order for custom sorting' },

  // Virtual & Downloadable
  { value: 'virtual', label: 'Virtual', category: 'Product Types', description: 'Virtual product (true/false)' },
  { value: 'downloadable', label: 'Downloadable', category: 'Product Types', description: 'Downloadable product (true/false)' },
  { value: 'downloads', label: 'Downloads (Array)', category: 'Product Types', description: 'Array of downloadable files' },
  { value: 'download_limit', label: 'Download Limit', category: 'Product Types', description: 'Number of downloads allowed (-1 for unlimited)' },
  { value: 'download_expiry', label: 'Download Expiry', category: 'Product Types', description: 'Number of days until download expires (-1 for never)' },

  // External Products
  { value: 'external_url', label: 'External URL', category: 'Product Types', description: 'External product URL' },
  { value: 'button_text', label: 'Button Text', category: 'Product Types', description: 'External product button text' },

  // Brand (common plugin field - often available via third-party plugins)
  { value: 'brands', label: 'Brands (Array)', category: 'Brand', description: 'Product brands (if plugin enabled)' },
  { value: 'brands[0].name', label: 'Brand Name', category: 'Brand', description: 'Primary brand name' },
  { value: 'brands[0].slug', label: 'Brand Slug', category: 'Brand', description: 'Primary brand slug' },
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

  // Seed Standard WooCommerce Fields
  console.log(`Seeding ${WOO_COMMERCE_FIELDS.length} standard WooCommerce fields...`);
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
  console.log(`✅ Created ${WOO_COMMERCE_FIELDS.length} standard WooCommerce fields`);

  // Seed Shop-Level Fields
  console.log(`Seeding ${SHOP_FIELDS.length} shop-level fields...`);
  for (const field of SHOP_FIELDS) {
    await prisma.wooCommerceField.create({
      data: {
        value: field.value,
        label: field.label,
        description: field.description || null,
        category: field.category,
      },
    });
  }
  console.log(`✅ Created ${SHOP_FIELDS.length} shop-level fields`);

  console.log('🎉 Seeding completed!');
  console.log(`
📊 Summary:
  - OpenAI Fields: ${OPENAI_FEED_SPEC.length}
  - Standard WooCommerce Fields: ${WOO_COMMERCE_FIELDS.length}
  - Shop-Level Fields: ${SHOP_FIELDS.length}
  - Total: ${OPENAI_FEED_SPEC.length + WOO_COMMERCE_FIELDS.length + SHOP_FIELDS.length}

Note: Custom meta_data fields (e.g., meta_data._gtin, meta_data._brand) are shop-specific
and should be discovered dynamically using the field discovery feature.
Use POST /api/v1/shops/:id/discover-fields to scan your products for custom fields.
  `);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
