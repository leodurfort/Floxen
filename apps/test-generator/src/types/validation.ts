/**
 * Validation types for Store Validation feature
 *
 * Used by ValidationService to check store data against expected definitions
 * and by ValidationDashboard to display results with expandable sections.
 */

// Status for individual checks and categories
export type ValidationStatus = 'pass' | 'fail' | 'warning' | 'skipped';

/**
 * Individual validation check result
 */
export interface ValidationCheck {
  name: string;
  status: ValidationStatus;
  expected: number | string;
  actual: number | string;
  difference?: number;
  details?: string;
}

/**
 * Category grouping multiple checks
 */
export interface ValidationCategory {
  name: string;
  status: ValidationStatus;
  checks: ValidationCheck[];
  passCount: number;
  failCount: number;
  warningCount: number;
}

/**
 * Summary statistics
 */
export interface ValidationSummary {
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
}

/**
 * Items missing from the store that need to be generated
 */
export interface MissingItems {
  brands: string[];
  categories: string[];
  products: {
    simple: string[]; // SKUs
    variable: string[]; // SKUs
    grouped: string[]; // SKUs
  };
  variations: Array<{ parentSku: string; variationSkus: string[] }>;
  relationships: string[]; // Product SKUs needing relationships
  reviews: string[]; // Product SKUs needing reviews
}

/**
 * Complete validation result
 */
export interface ValidationResult {
  timestamp: number;
  durationMs: number;
  overallStatus: ValidationStatus;
  categories: {
    counts: ValidationCategory;
    dataCompleteness: ValidationCategory;
    edgeCases: ValidationCategory;
    relationships: ValidationCategory;
    reviews: ValidationCategory;
  };
  summary: ValidationSummary;
  missingItems: MissingItems;
}

// ========================
// Validation Event Types
// ========================

export type ValidationPhase =
  | 'initializing'
  | 'checking-brands'
  | 'checking-categories'
  | 'checking-products'
  | 'checking-variations'
  | 'checking-data-completeness'
  | 'checking-edge-cases'
  | 'checking-relationships'
  | 'checking-reviews'
  | 'complete';

export interface ValidationProgressEvent {
  type: 'progress';
  phase: ValidationPhase;
  current: number;
  total: number;
  message: string;
}

export interface ValidationCompleteEvent {
  type: 'complete';
  result: ValidationResult;
}

export interface ValidationErrorEvent {
  type: 'error';
  error: {
    code: string;
    message: string;
  };
}

export interface ValidationHeartbeatEvent {
  type: 'heartbeat';
  timestamp: number;
}

export type ValidationEvent =
  | ValidationProgressEvent
  | ValidationCompleteEvent
  | ValidationErrorEvent
  | ValidationHeartbeatEvent;

// ========================
// Fix Event Types
// ========================

export type FixPhase =
  | 'fixing-brands'
  | 'fixing-categories'
  | 'fixing-simple-products'
  | 'fixing-variable-products'
  | 'fixing-variations'
  | 'fixing-grouped-products'
  | 'fixing-relationships'
  | 'fixing-reviews';

export interface FixProgressEvent {
  type: 'progress';
  phase: FixPhase;
  current: number;
  total: number;
  message: string;
}

export interface FixSummary {
  brandsCreated: number;
  categoriesCreated: number;
  productsCreated: number;
  variationsCreated: number;
  relationshipsCreated: number;
  reviewsCreated: number;
  durationMs: number;
}

export interface FixCompleteEvent {
  type: 'complete';
  summary: FixSummary;
}

export interface FixErrorEvent {
  type: 'error';
  error: {
    code: string;
    message: string;
  };
}

export type FixEvent =
  | FixProgressEvent
  | FixCompleteEvent
  | FixErrorEvent
  | ValidationHeartbeatEvent;
