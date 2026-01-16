import { deriveFeedState, type FeedState, type SyncStatus } from '@productsynch/shared';

export { deriveFeedState };
export type { FeedState, SyncStatus };

export interface FeedStateConfig {
  label: string;
  colorClass: string;
  dotClass: string;
}

export const FEED_STATE_CONFIG: Record<FeedState, FeedStateConfig> = {
  not_activated: {
    label: 'Not Activated',
    colorClass: 'text-gray-600',
    dotClass: 'bg-gray-400',
  },
  active: {
    label: 'Active',
    colorClass: 'text-green-600',
    dotClass: 'bg-green-500',
  },
  paused: {
    label: 'Paused',
    colorClass: 'text-amber-600',
    dotClass: 'bg-amber-500',
  },
  error: {
    label: 'Error',
    colorClass: 'text-red-600',
    dotClass: 'bg-red-500',
  },
};

export function getFeedStateConfig(shop: {
  openaiEnabled: boolean;
  syncEnabled: boolean;
  feedStatus: SyncStatus;
}): FeedStateConfig {
  const state = deriveFeedState(shop);
  return FEED_STATE_CONFIG[state];
}
