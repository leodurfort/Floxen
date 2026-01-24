/**
 * Default Value Transform Functions
 */

import type { TransformFunction } from '../types';

/** Default to 0 for inventory if not provided */
export const defaultToZero: TransformFunction = (value) => value ?? 0;
