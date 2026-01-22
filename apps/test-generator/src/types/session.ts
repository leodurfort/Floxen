import { FeedType } from './feed';

/**
 * Store information retrieved from WooCommerce
 */
export interface StoreInfo {
  currency: string;
  currencySymbol: string;
  dimensionUnit: string;
  weightUnit: string;
}

/**
 * Session data stored in encrypted cookie
 */
export interface SessionData {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
  connectedAt: number;
  storeInfo?: StoreInfo;
  feedType?: FeedType;
}
