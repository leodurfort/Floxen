/**
 * Field mappings that must remain fixed in the UI and API.
 *
 * IMPORTANT: These constants are now derived from openai-feed-spec.ts
 * to maintain a single source of truth. Do not modify this file directly.
 * Instead, mark fields as `isLocked: true` in the OPENAI_FEED_SPEC array.
 *
 * @deprecated - Import from './openai-feed-spec' instead
 */
export { LOCKED_FIELD_MAPPINGS, LOCKED_FIELD_SET } from './openai-feed-spec';
