/**
 * Temporary in-memory store for OAuth credentials
 *
 * This bridges the gap between:
 * 1. WooCommerce server-to-server POST callback (saves credentials)
 * 2. User browser redirect to return_url (needs to access credentials)
 *
 * These are two different HTTP sessions, so we need a shared store.
 * Credentials are automatically cleaned up after 5 minutes.
 */

interface PendingCredentials {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
  storeInfo?: {
    currency: string;
    currencySymbol: string;
    dimensionUnit: string;
    weightUnit: string;
  };
  createdAt: number;
}

// In-memory store keyed by encoded store URL
const pendingStore = new Map<string, PendingCredentials>();

// Cleanup interval (every minute)
const CLEANUP_INTERVAL = 60 * 1000;
// Credentials expire after 5 minutes
const EXPIRY_TIME = 5 * 60 * 1000;

// Start cleanup interval
let cleanupInterval: NodeJS.Timeout | null = null;

function startCleanup() {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    const entries = Array.from(pendingStore.entries());
    for (const [key, value] of entries) {
      if (now - value.createdAt > EXPIRY_TIME) {
        console.log('[PendingCredentials] Cleaning up expired entry for:', value.storeUrl);
        pendingStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
}

/**
 * Store credentials after successful OAuth callback
 * @param key - The encoded store URL (user_id from OAuth)
 * @param credentials - The OAuth credentials to store
 */
export function storePendingCredentials(
  key: string,
  credentials: Omit<PendingCredentials, 'createdAt'>
): void {
  startCleanup();

  console.log('[PendingCredentials] Storing credentials for:', credentials.storeUrl);
  pendingStore.set(key, {
    ...credentials,
    createdAt: Date.now(),
  });
}

/**
 * Retrieve and remove pending credentials
 * @param storeUrl - The store URL to look up
 * @returns The credentials if found, null otherwise
 */
export function getPendingCredentials(storeUrl: string): PendingCredentials | null {
  // Try to find by store URL (check all entries)
  const entries = Array.from(pendingStore.entries());
  for (const [key, value] of entries) {
    if (value.storeUrl === storeUrl) {
      console.log('[PendingCredentials] Found credentials for:', storeUrl);
      pendingStore.delete(key);
      return value;
    }
  }

  console.log('[PendingCredentials] No pending credentials for:', storeUrl);
  return null;
}

/**
 * Check if there are any pending credentials (for status check)
 * Returns the most recent pending credentials if any exist
 */
export function getAnyPendingCredentials(): PendingCredentials | null {
  if (pendingStore.size === 0) {
    return null;
  }

  // Get the most recent entry
  let mostRecent: PendingCredentials | null = null;
  let mostRecentKey: string | null = null;

  const entries = Array.from(pendingStore.entries());
  for (const [key, value] of entries) {
    if (!mostRecent || value.createdAt > mostRecent.createdAt) {
      mostRecent = value;
      mostRecentKey = key;
    }
  }

  if (mostRecent && mostRecentKey) {
    console.log('[PendingCredentials] Returning most recent credentials for:', mostRecent.storeUrl);
    pendingStore.delete(mostRecentKey);
    return mostRecent;
  }

  return null;
}
