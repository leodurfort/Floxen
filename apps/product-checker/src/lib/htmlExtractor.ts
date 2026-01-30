/**
 * HTML Extractor — Pulls structured product data from HTML using multiple
 * strategies: JSON-LD, Open Graph, Microdata, and generic meta / head tags.
 *
 * Priority when merging:  JSON-LD  >  Microdata  >  Open Graph  >  Meta/Head
 */

import * as cheerio from 'cheerio';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExtractedProductData {
  name: string | null;
  description: string | null;
  brand: string | null;
  sku: string | null;
  gtin: string | null;
  mpn: string | null;
  price: string | null;
  currency: string | null;
  salePrice: string | null;
  availability: string | null;
  condition: string | null;
  category: string | null;
  material: string | null;
  color: string | null;
  size: string | null;
  weight: string | null;
  images: string[];
  reviewCount: number | null;
  ratingValue: number | null;
  url: string | null;
  sellerName: string | null;
  sellerUrl: string | null;
  // Page-level data
  pageTitle: string | null;
  metaDescription: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  canonicalUrl: string | null;
}

export interface SeoSignals {
  hasJsonLd: boolean;
  hasOpenGraph: boolean;
  hasMicrodata: boolean;
  hasCanonicalUrl: boolean;
  hasMetaDescription: boolean;
  hasH1: boolean;
  isHttps: boolean;
}

export interface ExtractionResult {
  product: ExtractedProductData;
  seoSignals: SeoSignals;
  sources: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyProduct(): ExtractedProductData {
  return {
    name: null,
    description: null,
    brand: null,
    sku: null,
    gtin: null,
    mpn: null,
    price: null,
    currency: null,
    salePrice: null,
    availability: null,
    condition: null,
    category: null,
    material: null,
    color: null,
    size: null,
    weight: null,
    images: [],
    reviewCount: null,
    ratingValue: null,
    url: null,
    sellerName: null,
    sellerUrl: null,
    pageTitle: null,
    metaDescription: null,
    ogTitle: null,
    ogDescription: null,
    ogImage: null,
    canonicalUrl: null,
  };
}

function safeString(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  return s.length > 0 ? s : null;
}

function safeNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

/**
 * Recursively search a JSON-LD structure for objects with @type === "Product".
 * Handles @graph arrays, nested objects, and arrays of typed entities.
 */
function findProductInJsonLd(data: any): any | null {
  if (!data || typeof data !== 'object') return null;

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findProductInJsonLd(item);
      if (found) return found;
    }
    return null;
  }

  // Check @type — can be a string or an array
  const type = data['@type'];
  if (type) {
    const types = Array.isArray(type) ? type : [type];
    if (types.some((t: string) => t.toLowerCase() === 'product')) {
      return data;
    }
  }

  // Check @graph
  if (Array.isArray(data['@graph'])) {
    const found = findProductInJsonLd(data['@graph']);
    if (found) return found;
  }

  return null;
}

/** Extract price components from an Offer or offers array inside JSON-LD. */
function extractOfferData(product: any): {
  price: string | null;
  currency: string | null;
  salePrice: string | null;
  availability: string | null;
} {
  const result = { price: null as string | null, currency: null as string | null, salePrice: null as string | null, availability: null as string | null };

  let offer: any = null;

  if (product.offers) {
    const offers = product.offers;
    if (Array.isArray(offers)) {
      offer = offers[0]; // take first offer
    } else if (typeof offers === 'object') {
      offer = offers;
    }
  }

  if (!offer) {
    // Some schemas put price at the product level
    result.price = safeString(product.price);
    result.currency = safeString(product.priceCurrency);
    result.availability = safeString(product.availability);
    return result;
  }

  result.price = safeString(offer.price ?? offer.lowPrice);
  result.currency = safeString(offer.priceCurrency);
  result.availability = safeString(offer.availability);

  // Some pages expose sale vs regular price via highPrice / lowPrice
  if (offer.highPrice && offer.lowPrice && offer.highPrice !== offer.lowPrice) {
    result.price = safeString(offer.highPrice);
    result.salePrice = safeString(offer.lowPrice);
  }

  // Seller
  return result;
}

function extractSellerFromJsonLd(product: any): { sellerName: string | null; sellerUrl: string | null } {
  let offer: any = product.offers;
  if (Array.isArray(offer)) offer = offer[0];

  const seller = offer?.seller ?? product.seller;
  if (!seller) return { sellerName: null, sellerUrl: null };

  return {
    sellerName: safeString(seller.name),
    sellerUrl: safeString(seller.url),
  };
}

function extractBrandFromJsonLd(product: any): string | null {
  if (!product.brand) return null;
  if (typeof product.brand === 'string') return product.brand;
  return safeString(product.brand.name);
}

function extractRatingFromJsonLd(product: any): { reviewCount: number | null; ratingValue: number | null } {
  const agg = product.aggregateRating;
  if (!agg) return { reviewCount: null, ratingValue: null };
  return {
    reviewCount: safeNumber(agg.reviewCount ?? agg.ratingCount),
    ratingValue: safeNumber(agg.ratingValue),
  };
}

function extractImagesFromJsonLd(product: any): string[] {
  const raw = product.image;
  if (!raw) return [];
  if (typeof raw === 'string') return [raw];
  if (Array.isArray(raw)) {
    return raw.map((img: any) => (typeof img === 'string' ? img : img?.url ?? img?.contentUrl)).filter(Boolean);
  }
  if (typeof raw === 'object') {
    return [raw.url ?? raw.contentUrl].filter(Boolean);
  }
  return [];
}

// ---------------------------------------------------------------------------
// Extraction strategies
// ---------------------------------------------------------------------------

/**
 * Extract product data from JSON-LD script blocks.
 */
export function extractJsonLd(html: string): ExtractedProductData {
  const $ = cheerio.load(html);
  const data = emptyProduct();

  const scripts = $('script[type="application/ld+json"]');
  let product: any = null;

  scripts.each((_i, el) => {
    if (product) return; // already found
    const raw = $(el).html();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      product = findProductInJsonLd(parsed);
    } catch {
      // Malformed JSON — skip
    }
  });

  if (!product) return data;

  data.name = safeString(product.name);
  data.description = safeString(product.description);
  data.brand = extractBrandFromJsonLd(product);
  data.sku = safeString(product.sku);
  data.gtin = safeString(product.gtin ?? product.gtin13 ?? product.gtin12 ?? product.gtin14 ?? product.gtin8 ?? product.isbn);
  data.mpn = safeString(product.mpn);
  data.category = safeString(product.category);
  data.material = safeString(product.material);
  data.color = safeString(product.color);
  data.size = safeString(product.size);
  data.weight = safeString(product.weight?.value ? `${product.weight.value} ${product.weight.unitText ?? product.weight.unitCode ?? ''}`.trim() : product.weight);
  data.condition = safeString(product.itemCondition);
  data.url = safeString(product.url);
  data.images = extractImagesFromJsonLd(product);

  const offerData = extractOfferData(product);
  data.price = offerData.price;
  data.currency = offerData.currency;
  data.salePrice = offerData.salePrice;
  data.availability = offerData.availability;

  const seller = extractSellerFromJsonLd(product);
  data.sellerName = seller.sellerName;
  data.sellerUrl = seller.sellerUrl;

  const rating = extractRatingFromJsonLd(product);
  data.reviewCount = rating.reviewCount;
  data.ratingValue = rating.ratingValue;

  return data;
}

/**
 * Extract product data from Open Graph meta tags.
 */
export function extractOpenGraph(html: string): ExtractedProductData {
  const $ = cheerio.load(html);
  const data = emptyProduct();

  const og = (property: string): string | null => {
    const content = $(`meta[property="${property}"]`).attr('content');
    return safeString(content);
  };

  data.ogTitle = og('og:title');
  data.ogDescription = og('og:description');
  data.ogImage = og('og:image');
  data.url = og('og:url');

  // Product-specific OG tags
  data.price = og('product:price:amount') ?? og('og:price:amount');
  data.currency = og('product:price:currency') ?? og('og:price:currency');
  data.availability = og('product:availability') ?? og('og:availability');
  data.brand = og('product:brand') ?? og('og:brand');
  data.condition = og('product:condition') ?? og('og:condition');

  // Use og:title/description as product name/description fallback
  data.name = data.ogTitle;
  data.description = data.ogDescription;

  if (data.ogImage) {
    data.images = [data.ogImage];
  }

  return data;
}

/**
 * Extract page-level meta tags: <title>, meta description, canonical URL.
 */
export function extractMetaTags(html: string): ExtractedProductData {
  const $ = cheerio.load(html);
  const data = emptyProduct();

  data.pageTitle = safeString($('title').first().text());
  data.metaDescription = safeString(
    $('meta[name="description"]').attr('content') ?? $('meta[name="Description"]').attr('content'),
  );
  data.canonicalUrl = safeString($('link[rel="canonical"]').attr('href'));

  // Use page title as a weak name fallback
  data.name = data.pageTitle;
  data.description = data.metaDescription;

  return data;
}

/**
 * Extract product data from HTML Microdata (schema.org/Product itemscope).
 */
export function extractMicrodata(html: string): ExtractedProductData {
  const $ = cheerio.load(html);
  const data = emptyProduct();

  // Find the Product itemscope
  const productScope = $('[itemtype*="schema.org/Product"]').first();
  if (productScope.length === 0) return data;

  const prop = (name: string): string | null => {
    // Prefer direct children, then any descendants
    const el =
      productScope.find(`[itemprop="${name}"]`).first();
    if (el.length === 0) return null;

    // <meta itemprop> → content attribute
    if (el.is('meta')) return safeString(el.attr('content'));
    // <link itemprop> → href attribute
    if (el.is('link') || el.is('a')) return safeString(el.attr('href'));
    // <img itemprop> → src attribute
    if (el.is('img')) return safeString(el.attr('src'));
    // Otherwise: text content
    return safeString(el.text());
  };

  data.name = prop('name');
  data.description = prop('description');
  data.sku = prop('sku');
  data.gtin = prop('gtin') ?? prop('gtin13') ?? prop('gtin12') ?? prop('gtin14');
  data.mpn = prop('mpn');
  data.brand = prop('brand');
  data.category = prop('category');
  data.material = prop('material');
  data.color = prop('color');
  data.size = prop('size');
  data.weight = prop('weight');
  data.condition = prop('itemCondition');
  data.url = prop('url');

  // Images
  const imgs: string[] = [];
  productScope.find('[itemprop="image"]').each((_i, el) => {
    const src = $(el).is('img') ? $(el).attr('src') : $(el).is('meta') ? $(el).attr('content') : $(el).attr('href');
    if (src) imgs.push(src);
  });
  data.images = imgs;

  // Offer sub-scope
  const offerScope = productScope.find('[itemtype*="schema.org/Offer"]').first();
  if (offerScope.length > 0) {
    const offerProp = (name: string): string | null => {
      const el = offerScope.find(`[itemprop="${name}"]`).first();
      if (el.length === 0) return null;
      if (el.is('meta')) return safeString(el.attr('content'));
      if (el.is('link')) return safeString(el.attr('href'));
      return safeString(el.text());
    };

    data.price = offerProp('price');
    data.currency = offerProp('priceCurrency');
    data.availability = offerProp('availability');

    // Seller
    const sellerScope = offerScope.find('[itemprop="seller"]').first();
    if (sellerScope.length > 0) {
      const sellerEl = sellerScope.find('[itemprop="name"]').first();
      data.sellerName = sellerEl.length > 0 ? safeString(sellerEl.text()) : safeString(sellerScope.text());
      const sellerUrlEl = sellerScope.find('[itemprop="url"]').first();
      data.sellerUrl = sellerUrlEl.length > 0
        ? safeString(sellerUrlEl.is('a') || sellerUrlEl.is('link') ? sellerUrlEl.attr('href') : sellerUrlEl.text())
        : null;
    }
  }

  // AggregateRating sub-scope
  const ratingScope = productScope.find('[itemtype*="schema.org/AggregateRating"]').first();
  if (ratingScope.length > 0) {
    const ratingProp = (name: string): string | null => {
      const el = ratingScope.find(`[itemprop="${name}"]`).first();
      if (el.length === 0) return null;
      if (el.is('meta')) return safeString(el.attr('content'));
      return safeString(el.text());
    };
    data.reviewCount = safeNumber(ratingProp('reviewCount') ?? ratingProp('ratingCount'));
    data.ratingValue = safeNumber(ratingProp('ratingValue'));
  }

  return data;
}

// ---------------------------------------------------------------------------
// Merge logic
// ---------------------------------------------------------------------------

/**
 * Merge multiple ExtractedProductData objects, where earlier sources take
 * precedence over later ones for scalar fields.  Arrays (images) are merged
 * with deduplication, preferring the order of the earlier source.
 */
function mergeExtracted(...sources: ExtractedProductData[]): ExtractedProductData {
  const merged = emptyProduct();

  for (const key of Object.keys(merged) as (keyof ExtractedProductData)[]) {
    if (key === 'images') continue; // handled separately
    for (const src of sources) {
      const val = src[key];
      if (val !== null && val !== undefined) {
        (merged as any)[key] = val;
        break;
      }
    }
  }

  // Merge images with deduplication
  const seen = new Set<string>();
  const mergedImages: string[] = [];
  for (const src of sources) {
    for (const img of src.images) {
      if (!seen.has(img)) {
        seen.add(img);
        mergedImages.push(img);
      }
    }
  }
  merged.images = mergedImages;

  return merged;
}

// ---------------------------------------------------------------------------
// SEO signals
// ---------------------------------------------------------------------------

function detectSeoSignals(html: string, url: string): SeoSignals {
  const $ = cheerio.load(html);

  return {
    hasJsonLd: $('script[type="application/ld+json"]').length > 0,
    hasOpenGraph: $('meta[property^="og:"]').length > 0,
    hasMicrodata: $('[itemtype*="schema.org"]').length > 0,
    hasCanonicalUrl: $('link[rel="canonical"]').length > 0,
    hasMetaDescription: $('meta[name="description"]').length > 0 || $('meta[name="Description"]').length > 0,
    hasH1: $('h1').length > 0,
    isHttps: url.startsWith('https://'),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run all extraction strategies against the given HTML and merge results.
 *
 * Priority: JSON-LD > Microdata > Open Graph > Meta/Head tags.
 */
export function extractAll(html: string, url: string): ExtractionResult {
  const jsonLdData = extractJsonLd(html);
  const microdataData = extractMicrodata(html);
  const ogData = extractOpenGraph(html);
  const metaData = extractMetaTags(html);

  // Merge with priority order
  const product = mergeExtracted(jsonLdData, microdataData, ogData, metaData);

  // Track which sources contributed data
  const sources: string[] = [];
  if (hasAnyProductData(jsonLdData)) sources.push('json-ld');
  if (hasAnyProductData(microdataData)) sources.push('microdata');
  if (hasAnyProductData(ogData)) sources.push('opengraph');
  if (hasAnyProductData(metaData)) sources.push('meta-tags');

  const seoSignals = detectSeoSignals(html, url);

  return { product, seoSignals, sources };
}

/**
 * Returns true if the extracted data has at least one meaningful product field
 * (not just page-level meta data).
 */
function hasAnyProductData(data: ExtractedProductData): boolean {
  const productFields: (keyof ExtractedProductData)[] = [
    'name', 'description', 'brand', 'sku', 'gtin', 'mpn',
    'price', 'currency', 'salePrice', 'availability', 'condition',
    'category', 'material', 'color', 'size', 'weight',
    'reviewCount', 'ratingValue', 'url', 'sellerName', 'sellerUrl',
  ];

  for (const key of productFields) {
    const val = data[key];
    if (val !== null && val !== undefined) return true;
  }

  if (data.images.length > 0) return true;

  // Page-level fields also count
  if (data.ogTitle || data.ogDescription || data.ogImage || data.pageTitle || data.metaDescription || data.canonicalUrl) {
    return true;
  }

  return false;
}
