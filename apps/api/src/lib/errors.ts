import { UnrecoverableError } from 'bullmq';

/**
 * HTTP status codes that indicate the error won't self-resolve
 * and retrying would be pointless
 */
const NON_RETRYABLE_STATUS_CODES = new Set([
  400, // Bad Request - malformed request
  401, // Unauthorized - invalid credentials
  403, // Forbidden - permission denied
  404, // Not Found - resource doesn't exist
  410, // Gone - resource permanently removed
  422, // Unprocessable Entity - validation error
]);

/**
 * Error messages that indicate non-retryable conditions
 */
const NON_RETRYABLE_MESSAGES = [
  'consumer_key',
  'consumer_secret',
  'invalid signature',
  'rest_forbidden',
  'woocommerce_rest_cannot_view',
];

/**
 * Extracts HTTP status code from various error formats
 */
function getStatusCode(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;

  const err = error as Record<string, unknown>;

  // Axios error format (WooCommerce REST API uses Axios)
  if (err.response && typeof err.response === 'object') {
    const response = err.response as Record<string, unknown>;
    if (typeof response.status === 'number') {
      return response.status;
    }
  }

  // Direct status property
  if (typeof err.status === 'number') {
    return err.status;
  }

  // statusCode property (some libraries use this)
  if (typeof err.statusCode === 'number') {
    return err.statusCode;
  }

  return null;
}

/**
 * Check if error message contains non-retryable keywords
 */
function hasNonRetryableMessage(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  return NON_RETRYABLE_MESSAGES.some((keyword) => message.includes(keyword.toLowerCase()));
}

/**
 * Determines if an error is retryable or should fail immediately
 */
export function isRetryableError(error: unknown): boolean {
  // Check HTTP status code
  const statusCode = getStatusCode(error);
  if (statusCode && NON_RETRYABLE_STATUS_CODES.has(statusCode)) {
    return false;
  }

  // Check error message for non-retryable patterns
  if (hasNonRetryableMessage(error)) {
    return false;
  }

  // All other errors are considered retryable:
  // - Timeouts (ETIMEDOUT, ECONNABORTED)
  // - Network errors (ECONNREFUSED, ENOTFOUND)
  // - Rate limits (429)
  // - Server errors (5xx)
  return true;
}

/**
 * Wraps an error as UnrecoverableError if it's not retryable
 * This tells BullMQ to skip retry attempts
 */
export function wrapNonRetryableError(error: unknown): Error {
  if (isRetryableError(error)) {
    // Return original error - BullMQ will retry
    return error instanceof Error ? error : new Error(String(error));
  }

  // Wrap in UnrecoverableError - BullMQ will NOT retry
  const originalMessage = error instanceof Error ? error.message : String(error);
  const statusCode = getStatusCode(error);
  const reason = statusCode ? `Non-retryable HTTP ${statusCode}` : 'Non-retryable error pattern';

  return new UnrecoverableError(`${reason}: ${originalMessage}`);
}

/**
 * Error classification result for logging
 */
export interface ErrorClassification {
  isRetryable: boolean;
  statusCode: number | null;
  errorType: 'auth' | 'not_found' | 'client_error' | 'server_error' | 'network' | 'timeout' | 'unknown';
}

/**
 * Classify an error for logging and monitoring purposes
 */
export function classifyError(error: unknown): ErrorClassification {
  const statusCode = getStatusCode(error);
  const retryable = isRetryableError(error);

  let errorType: ErrorClassification['errorType'] = 'unknown';

  if (statusCode) {
    if (statusCode === 401 || statusCode === 403) {
      errorType = 'auth';
    } else if (statusCode === 404 || statusCode === 410) {
      errorType = 'not_found';
    } else if (statusCode >= 400 && statusCode < 500) {
      errorType = 'client_error';
    } else if (statusCode >= 500) {
      errorType = 'server_error';
    }
  } else {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes('ETIMEDOUT') ||
      message.includes('ECONNABORTED') ||
      message.includes('timeout')
    ) {
      errorType = 'timeout';
    } else if (
      message.includes('ECONNREFUSED') ||
      message.includes('ENOTFOUND') ||
      message.includes('network')
    ) {
      errorType = 'network';
    }
  }

  return { isRetryable: retryable, statusCode, errorType };
}
