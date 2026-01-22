import { FeedType } from './feed';

/**
 * API response types
 */

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data?: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * OAuth initiate response
 */
export interface OAuthInitiateResponse {
  success: true;
  authUrl: string;
}

/**
 * Status check response
 */
export interface StatusResponse {
  connected: boolean;
  storeUrl?: string;
  storeInfo?: {
    currency: string;
    dimensionUnit: string;
    weightUnit: string;
  };
  connectedAt?: number;
  feedType?: FeedType;
}

/**
 * Error codes
 */
export const ERROR_CODES = {
  INVALID_URL: 'INVALID_URL',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  GENERATION_FAILED: 'GENERATION_FAILED',
  CLEANUP_FAILED: 'CLEANUP_FAILED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  FIX_FAILED: 'FIX_FAILED',
  WOOCOMMERCE_ERROR: 'WOOCOMMERCE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
