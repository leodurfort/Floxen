/**
 * Analyzer — Orchestrator that ties together URL safety validation, HTML
 * fetching, product data extraction, OpenAI spec mapping, validation, and
 * scoring into a single `analyzeUrl` call.
 */

import { validateFeedEntry, OPENAI_FEED_SPEC, CATEGORY_CONFIG } from '@floxen/shared';
import type { FieldValidationError } from '@floxen/shared';

import { validateUrlSafety, SsrfError } from './ssrfGuard';
import { extractAll } from './htmlExtractor';
import type { SeoSignals } from './htmlExtractor';
import { mapToOpenAISpec } from './mapToOpenAISpec';
import { computeScore } from './scoreCalculator';
import type { ScoreResult } from './scoreCalculator';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FETCH_TIMEOUT_MS = 15_000;
const MAX_BODY_SIZE = 5 * 1024 * 1024; // 5 MB
const USER_AGENT = 'FloxenBot/1.0 (+https://floxen.ai)';

/**
 * Fields to skip during validation. These fields are either shop-managed,
 * feature-gated, or otherwise impossible to infer from a scraped product page.
 */
export const SKIP_FIELDS = [
  'enable_search',
  'enable_checkout',
  'seller_name',
  'seller_url',
  'seller_privacy_policy',
  'seller_tos',
  'return_policy',
  'return_window',
  'custom_variant1_category',
  'custom_variant1_option',
  'custom_variant2_category',
  'custom_variant2_option',
  'custom_variant3_category',
  'custom_variant3_option',
  'geo_price',
  'geo_availability',
  'pickup_method',
  'pickup_sla',
  'delivery_estimate',
  'expiration_date',
  'store_review_count',
  'store_review_rating',
  'raw_review_data',
  'related_product_id',
  'relationship_type',
  'pricing_trend',
];

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class AnalysisError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode: number = 400) {
    super(message);
    this.name = 'AnalysisError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface AnalysisResult {
  url: string;
  analyzedAt: string;
  noDataFound: boolean;
  score: {
    overall: number;
    grade: string;
    errorCount: number;
    warningCount: number;
    passedCount: number;
    totalFieldsChecked: number;
  };
  product: {
    title: string | null;
    image: string | null;
    price: string | null;
    availability: string | null;
    brand: string | null;
    url: string;
  };
  categories: ScoreResult['categoryScores'];
  errors: Array<{ field: string; message: string; category: string }>;
  warnings: Array<{ field: string; message: string; category: string }>;
  passed: Array<{ field: string; category: string; value: any }>;
  seoSignals: SeoSignals;
  extraction: {
    sources: string[];
    fieldsExtracted: number;
    fieldsTotal: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a quick lookup from attribute → category label.
 */
function buildFieldCategoryMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const spec of OPENAI_FEED_SPEC) {
    const config = CATEGORY_CONFIG[spec.category];
    map.set(spec.attribute, config?.label ?? spec.category);
  }
  return map;
}

function countMeaningfulFields(mapped: Record<string, any>): number {
  const skipSet = new Set(SKIP_FIELDS);
  let count = 0;
  for (const [key, value] of Object.entries(mapped)) {
    if (skipSet.has(key)) continue;
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    count++;
  }
  return count;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Analyze a product URL end-to-end:
 *
 * 1. SSRF validation
 * 2. Fetch HTML
 * 3. Extract structured data
 * 4. Map to OpenAI spec
 * 5. Validate against spec
 * 6. Compute score
 * 7. Build result payload
 */
export async function analyzeUrl(url: string): Promise<AnalysisResult> {
  // ------- Step 1: SSRF guard -------
  try {
    await validateUrlSafety(url);
  } catch (err) {
    if (err instanceof SsrfError) {
      throw new AnalysisError('SSRF_BLOCKED', err.message, 403);
    }
    throw err;
  }

  // ------- Step 2: Fetch HTML -------
  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html',
      },
      redirect: 'follow',
    });
  } catch (err: any) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new AnalysisError(
        'TIMEOUT',
        `Request to ${url} timed out after ${FETCH_TIMEOUT_MS / 1000}s.`,
        408,
      );
    }
    throw new AnalysisError(
      'FETCH_FAILED',
      `Failed to fetch ${url}: ${err?.message ?? 'unknown error'}`,
      502,
    );
  }

  if (!response.ok) {
    throw new AnalysisError(
      'FETCH_FAILED',
      `Received HTTP ${response.status} from ${url}.`,
      502,
    );
  }

  // Validate content type
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html')) {
    throw new AnalysisError(
      'NOT_HTML',
      `Expected text/html but received "${contentType}".`,
      400,
    );
  }

  // Read body with size guard
  const contentLength = response.headers.get('content-length');
  if (contentLength && Number(contentLength) > MAX_BODY_SIZE) {
    throw new AnalysisError(
      'PAGE_TOO_LARGE',
      `Page exceeds maximum allowed size of ${MAX_BODY_SIZE / (1024 * 1024)}MB.`,
      400,
    );
  }

  const html = await response.text();

  if (html.length > MAX_BODY_SIZE) {
    throw new AnalysisError(
      'PAGE_TOO_LARGE',
      `Page body exceeds maximum allowed size of ${MAX_BODY_SIZE / (1024 * 1024)}MB.`,
      400,
    );
  }

  // ------- Step 3: Extract structured data -------
  const extraction = extractAll(html, url);
  const { product: extracted, seoSignals, sources } = extraction;

  // ------- Step 4: Map to OpenAI spec -------
  const mapped = mapToOpenAISpec(extracted, url);

  // ------- Step 5: Early exit if no product data at all -------
  const fieldsExtracted = countMeaningfulFields(mapped);
  const fieldsTotal = OPENAI_FEED_SPEC.filter(
    (s) => !new Set(SKIP_FIELDS).has(s.attribute),
  ).length;

  if (fieldsExtracted === 0) {
    // No product data could be found on this page
    return {
      url,
      analyzedAt: new Date().toISOString(),
      noDataFound: true,
      score: {
        overall: 0,
        grade: 'Poor',
        errorCount: 0,
        warningCount: 0,
        passedCount: 0,
        totalFieldsChecked: fieldsTotal,
      },
      product: {
        title: extracted.pageTitle ?? extracted.ogTitle ?? null,
        image: extracted.ogImage ?? null,
        price: null,
        availability: null,
        brand: null,
        url,
      },
      categories: [],
      errors: [],
      warnings: [],
      passed: [],
      seoSignals,
      extraction: {
        sources,
        fieldsExtracted: 0,
        fieldsTotal,
      },
    };
  }

  // ------- Step 6: Validate -------
  const validation = validateFeedEntry(mapped, { skipFields: SKIP_FIELDS });
  const { errors: validationErrors, warnings: validationWarnings } = validation;

  // ------- Step 7: Score -------
  const scoreResult = computeScore(mapped, validationErrors, validationWarnings, SKIP_FIELDS);

  // ------- Step 8: Build result -------
  const fieldCategoryMap = buildFieldCategoryMap();

  const taggedErrors = validationErrors.map((e) => ({
    field: e.field,
    message: e.error,
    category: fieldCategoryMap.get(e.field) ?? 'Unknown',
  }));

  const taggedWarnings = validationWarnings.map((w) => ({
    field: w.field,
    message: w.error,
    category: fieldCategoryMap.get(w.field) ?? 'Unknown',
  }));

  // Build passed list — all fields that passed validation with a value
  const errorFields = new Set(validationErrors.map((e) => e.field));
  const warningFields = new Set(validationWarnings.map((w) => w.field));
  const skipSet = new Set(SKIP_FIELDS);

  const passed: Array<{ field: string; category: string; value: any }> = [];
  for (const spec of OPENAI_FEED_SPEC) {
    if (skipSet.has(spec.attribute)) continue;
    if (errorFields.has(spec.attribute)) continue;
    if (warningFields.has(spec.attribute)) continue;

    const value = mapped[spec.attribute];
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;

    passed.push({
      field: spec.attribute,
      category: fieldCategoryMap.get(spec.attribute) ?? 'Unknown',
      value,
    });
  }

  return {
    url,
    analyzedAt: new Date().toISOString(),
    noDataFound: scoreResult.noDataFound,
    score: {
      overall: scoreResult.overall,
      grade: scoreResult.grade,
      errorCount: scoreResult.errorCount,
      warningCount: scoreResult.warningCount,
      passedCount: scoreResult.passedCount,
      totalFieldsChecked: scoreResult.totalFieldsChecked,
    },
    product: {
      title: mapped.title ?? null,
      image: mapped.image_link ?? null,
      price: mapped.price ?? null,
      availability: mapped.availability ?? null,
      brand: mapped.brand ?? null,
      url,
    },
    categories: scoreResult.categoryScores,
    errors: taggedErrors,
    warnings: taggedWarnings,
    passed,
    seoSignals,
    extraction: {
      sources,
      fieldsExtracted,
      fieldsTotal,
    },
  };
}
