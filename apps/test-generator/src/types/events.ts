/**
 * Server-Sent Events types for progress tracking
 */

export type GeneratorPhase =
  | 'checking'
  | 'brands'
  | 'categories'
  | 'simple-products'
  | 'variable-products'
  | 'variations'
  | 'grouped-products'
  | 'relationships'
  | 'reviews';

export type CleanupPhase =
  | 'finding'
  | 'deleting-variations'
  | 'deleting-products'
  | 'deleting-categories'
  | 'deleting-brands';

/**
 * Progress event during generation or cleanup
 */
export interface ProgressEvent {
  type: 'progress';
  phase: GeneratorPhase | CleanupPhase;
  current: number;
  total: number;
  message: string;
}

/**
 * Heartbeat event to keep connection alive
 */
export interface HeartbeatEvent {
  type: 'heartbeat';
  timestamp: number;
}

/**
 * Completion event with summary
 */
export interface CompleteEvent {
  type: 'complete';
  summary: GenerationSummary | CleanupSummary;
}

/**
 * Error event
 */
export interface ErrorEvent {
  type: 'error';
  error: {
    code: string;
    message: string;
    phase?: string;
    sku?: string;
  };
}

/**
 * Generation summary
 */
export interface GenerationSummary {
  brands: number;
  categories: number;
  simpleProducts: number;
  variableProducts: number;
  variations: number;
  groupedProducts: number;
  totalProducts: number;
  durationMs: number;
  // Brand storage distribution
  brandDistribution?: {
    taxonomy: number;
    attribute: number;
    meta: number;
    none: number;
  };
  // Relationship counts
  relationships?: {
    related: number;
    crossSell: number;
    upsell: number;
  };
  // Review counts
  reviews?: number;
  // Resume info (when continuing from interrupted generation)
  resumed?: boolean;
  skipped?: {
    brands: number;
    categories: number;
    products: number;
    variations: number;
  };
}

/**
 * Cleanup summary
 */
export interface CleanupSummary {
  productsDeleted: number;
  variationsDeleted: number;
  categoriesDeleted: number;
  brandsDeleted: number;
  durationMs: number;
}

/**
 * Union type for all generator events
 */
export type GeneratorEvent =
  | ProgressEvent
  | HeartbeatEvent
  | CompleteEvent
  | ErrorEvent;
