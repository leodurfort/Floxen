/**
 * Server-Sent Events types for progress tracking
 */

export type GeneratorPhase =
  | 'categories'
  | 'simple-products'
  | 'variable-products'
  | 'variations'
  | 'grouped-products';

export type CleanupPhase =
  | 'finding'
  | 'deleting-variations'
  | 'deleting-products'
  | 'deleting-categories';

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
  categories: number;
  simpleProducts: number;
  variableProducts: number;
  variations: number;
  groupedProducts: number;
  totalProducts: number;
  durationMs: number;
}

/**
 * Cleanup summary
 */
export interface CleanupSummary {
  productsDeleted: number;
  variationsDeleted: number;
  categoriesDeleted: number;
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
