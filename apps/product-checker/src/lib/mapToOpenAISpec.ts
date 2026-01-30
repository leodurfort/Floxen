/**
 * Map To OpenAI Spec — Converts ExtractedProductData into a flat
 * Record<string, any> keyed by OpenAI Commerce feed attribute names.
 */

import type { ExtractedProductData } from './htmlExtractor';

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Remove HTML tags and decode common HTML entities.
 */
export function stripHtmlTags(str: string | null | undefined): string | null {
  if (!str) return null;

  // Remove HTML tags
  let clean = str.replace(/<[^>]*>/g, '');

  // Decode common HTML entities
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&#x27;': "'",
    '&#x2F;': '/',
    '&ndash;': '\u2013',
    '&mdash;': '\u2014',
    '&laquo;': '\u00AB',
    '&raquo;': '\u00BB',
    '&copy;': '\u00A9',
    '&reg;': '\u00AE',
    '&trade;': '\u2122',
  };

  for (const [entity, char] of Object.entries(entities)) {
    clean = clean.replaceAll(entity, char);
  }

  // Decode numeric entities (decimal and hex)
  clean = clean.replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)));
  clean = clean.replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)));

  // Collapse whitespace
  clean = clean.replace(/\s+/g, ' ').trim();

  return clean.length > 0 ? clean : null;
}

/**
 * Map schema.org availability URLs/strings to OpenAI enum values.
 *
 * Handles full URLs like "https://schema.org/InStock" as well as plain
 * strings like "InStock" or "in stock".
 */
export function mapAvailability(value: string | null | undefined): string | null {
  if (!value) return null;

  const normalised = value
    .toLowerCase()
    .replace(/https?:\/\/schema\.org\//i, '')
    .replace(/[_\s-]/g, '')
    .trim();

  if (normalised.includes('instock')) return 'in_stock';
  if (normalised.includes('outofstock') || normalised.includes('soldout')) return 'out_of_stock';
  if (normalised.includes('preorder') || normalised.includes('presale')) return 'preorder';
  if (normalised.includes('backorder')) return 'in_stock'; // treat backorder as in stock for OpenAI
  if (normalised.includes('limitedavailability')) return 'in_stock';
  if (normalised.includes('discontinued')) return 'out_of_stock';

  // If it already looks like a valid OpenAI enum, return it
  if (['in_stock', 'out_of_stock', 'preorder'].includes(value.trim().toLowerCase())) {
    return value.trim().toLowerCase();
  }

  return null;
}

/**
 * Map schema.org itemCondition URLs/strings to OpenAI enum values.
 */
export function mapCondition(value: string | null | undefined): string | null {
  if (!value) return null;

  const normalised = value
    .toLowerCase()
    .replace(/https?:\/\/schema\.org\//i, '')
    .replace(/[_\s-]/g, '')
    .trim();

  if (normalised.includes('new') && !normalised.includes('renew')) return 'new';
  if (normalised.includes('refurbished') || normalised.includes('renewed')) return 'refurbished';
  if (normalised.includes('used') || normalised.includes('secondhand')) return 'used';
  if (normalised.includes('damaged')) return 'used';

  // If it already looks like a valid OpenAI enum, return it
  if (['new', 'refurbished', 'used'].includes(value.trim().toLowerCase())) {
    return value.trim().toLowerCase();
  }

  return null;
}

/**
 * Format a price + currency into OpenAI's expected format: "79.99 USD".
 * Returns null if the amount is missing.
 */
export function formatPrice(
  amount: string | null | undefined,
  currency: string | null | undefined,
): string | null {
  if (!amount) return null;

  // Clean the amount string — remove currency symbols and whitespace
  const cleaned = amount.replace(/[^0-9.,]/g, '').trim();

  // Normalise decimal separator (handle European 1.234,56 format)
  let normalised: string;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // e.g. "1,234.56" or "1.234,56"
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      // European: "1.234,56" → "1234.56"
      normalised = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // US: "1,234.56" → "1234.56"
      normalised = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    // Could be "1234,56" (decimal) or "1,234" (thousands)
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Likely decimal comma: "79,99" → "79.99"
      normalised = cleaned.replace(',', '.');
    } else {
      // Thousands separator: "1,234" → "1234"
      normalised = cleaned.replace(/,/g, '');
    }
  } else {
    normalised = cleaned;
  }

  const num = parseFloat(normalised);
  if (isNaN(num)) return null;

  const formatted = num.toFixed(2);
  const curr = currency?.trim().toUpperCase();

  return curr ? `${formatted} ${curr}` : formatted;
}

// ---------------------------------------------------------------------------
// Main mapping function
// ---------------------------------------------------------------------------

/**
 * Map extracted product data to the flat OpenAI Commerce feed format.
 *
 * Every field in the 70-field spec is represented in the output. Fields that
 * cannot be derived from a scraped page are set to `null`.
 */
export function mapToOpenAISpec(
  extracted: ExtractedProductData,
  pageUrl: string,
): Record<string, any> {
  const title = extracted.name ?? extracted.ogTitle ?? extracted.pageTitle ?? null;
  const description = stripHtmlTags(extracted.description) ?? stripHtmlTags(extracted.ogDescription) ?? stripHtmlTags(extracted.metaDescription) ?? null;

  const images = extracted.images ?? [];
  const additionalImages = images.length > 1 ? images.slice(1) : null;

  return {
    // === Flags ===
    enable_search: null,
    enable_checkout: null,

    // === Basic Product Data ===
    id: extracted.sku ?? extracted.gtin ?? null,
    gtin: extracted.gtin ?? null,
    mpn: extracted.mpn ?? null,
    title,
    description,
    link: pageUrl,

    // === Item Information ===
    condition: mapCondition(extracted.condition),
    product_category: extracted.category ?? null,
    brand: extracted.brand ?? null,
    material: extracted.material ?? null,
    dimensions: null,
    length: null,
    width: null,
    height: null,
    weight: extracted.weight ?? null,
    age_group: null,

    // === Media ===
    image_link: images[0] ?? extracted.ogImage ?? null,
    additional_image_link: additionalImages,
    video_link: null,
    model_3d_link: null,

    // === Price & Promotions ===
    price: formatPrice(extracted.price, extracted.currency),
    sale_price: formatPrice(extracted.salePrice, extracted.currency),
    sale_price_effective_date: null,
    unit_pricing_measure: null,
    unit_pricing_base_measure: null,
    pricing_trend: null,

    // === Availability & Inventory ===
    availability: mapAvailability(extracted.availability),
    availability_date: null,
    inventory_quantity: null,
    expiration_date: null,
    pickup_method: null,
    pickup_sla: null,

    // === Variants ===
    item_group_id: null,
    item_group_title: null,
    color: extracted.color ?? null,
    size: extracted.size ?? null,
    size_system: null,
    gender: null,
    offer_id: null,
    custom_variant1_category: null,
    custom_variant1_option: null,
    custom_variant2_category: null,
    custom_variant2_option: null,
    custom_variant3_category: null,
    custom_variant3_option: null,

    // === Fulfillment ===
    shipping: null,
    delivery_estimate: null,

    // === Merchant Info ===
    seller_name: extracted.sellerName ?? null,
    seller_url: extracted.sellerUrl ?? null,
    seller_privacy_policy: null,
    seller_tos: null,

    // === Returns ===
    return_policy: null,
    return_window: null,

    // === Performance Signals ===
    popularity_score: null,
    return_rate: null,

    // === Compliance ===
    warning: null,
    warning_url: null,
    age_restriction: null,

    // === Reviews & Q&A ===
    product_review_count: extracted.reviewCount ?? null,
    product_review_rating: extracted.ratingValue ?? null,
    store_review_count: null,
    store_review_rating: null,
    q_and_a: null,
    raw_review_data: null,

    // === Related Products ===
    related_product_id: null,
    relationship_type: null,

    // === Geo Tagging ===
    geo_price: null,
    geo_availability: null,
  };
}
