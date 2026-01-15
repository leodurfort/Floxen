/**
 * Default Value Transform Functions
 */

import type { TransformFunction } from '../types';

/** Default to "new" condition if not provided */
export const defaultToNew: TransformFunction = (value) => value || 'new';

/** Default to 0 for inventory if not provided */
export const defaultToZero: TransformFunction = (value) => value ?? 0;
