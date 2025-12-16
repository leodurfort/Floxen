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
  { value: 'brands', label: 'All Brands (JSON)', category: 'Brand', description: 'All product brands' },
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
