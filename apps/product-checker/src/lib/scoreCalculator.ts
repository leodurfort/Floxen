/**
 * Score Calculator — Computes an overall quality score and per-category
 * breakdowns for a mapped OpenAI Commerce feed entry.
 */

import {
  OPENAI_FEED_SPEC,
  CATEGORY_CONFIG,
  type OpenAIFieldSpec,
  type OpenAIFieldCategory,
} from '@floxen/shared';
import type { FieldValidationError } from '@floxen/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FieldResult {
  attribute: string;
  requirement: string;
  status: 'pass' | 'error' | 'warning' | 'missing';
  value: any;
  message: string | null;
  description: string;
}

export interface CategoryScore {
  key: string;
  label: string;
  order: number;
  score: number;
  fields: FieldResult[];
}

export interface ScoreResult {
  overall: number;
  grade: 'Excellent' | 'Good' | 'Needs Work' | 'Poor';
  errorCount: number;
  warningCount: number;
  passedCount: number;
  totalFieldsChecked: number;
  categoryScores: CategoryScore[];
  noDataFound: boolean;
}

// ---------------------------------------------------------------------------
// Weights per requirement level
// ---------------------------------------------------------------------------

const REQUIREMENT_WEIGHTS: Record<string, number> = {
  Required: 3,
  Recommended: 2,
  Conditional: 1.5,
  Optional: 1,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hasValue(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

function resolveGrade(score: number): ScoreResult['grade'] {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Needs Work';
  return 'Poor';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute a weighted quality score from a mapped feed entry and its
 * validation results.
 *
 * Fields listed in `skipFields` are excluded from scoring entirely.
 */
export function computeScore(
  mappedEntry: Record<string, any>,
  errors: FieldValidationError[],
  warnings: FieldValidationError[],
  skipFields: string[],
): ScoreResult {
  const skipSet = new Set(skipFields);

  // Build fast lookup maps for errors and warnings
  const errorMap = new Map<string, FieldValidationError>();
  for (const e of errors) {
    errorMap.set(e.field, e);
  }

  const warningMap = new Map<string, FieldValidationError>();
  for (const w of warnings) {
    warningMap.set(w.field, w);
  }

  // Group spec fields by category
  const categoryGroups = new Map<OpenAIFieldCategory, OpenAIFieldSpec[]>();
  for (const spec of OPENAI_FEED_SPEC) {
    if (skipSet.has(spec.attribute)) continue;
    const list = categoryGroups.get(spec.category) ?? [];
    list.push(spec);
    categoryGroups.set(spec.category, list);
  }

  let totalWeightedScore = 0;
  let totalWeight = 0;
  let errorCount = 0;
  let warningCount = 0;
  let passedCount = 0;
  let fieldsWithValue = 0;
  let totalFieldsChecked = 0;

  const categoryScores: CategoryScore[] = [];

  for (const [categoryKey, specs] of categoryGroups) {
    const config = CATEGORY_CONFIG[categoryKey];
    if (!config) continue;

    let catWeightedScore = 0;
    let catWeight = 0;
    const fieldResults: FieldResult[] = [];

    for (const spec of specs) {
      const { attribute, requirement, description } = spec;
      const value = mappedEntry[attribute];
      const weight = REQUIREMENT_WEIGHTS[requirement] ?? 1;

      let status: FieldResult['status'];
      let message: string | null = null;
      let points: number;

      const fieldError = errorMap.get(attribute);
      const fieldWarning = warningMap.get(attribute);

      if (fieldError) {
        // Field has a validation error → 0 points
        status = 'error';
        message = fieldError.error;
        points = 0;
        errorCount++;
      } else if (fieldWarning) {
        // Field has a warning → half credit
        status = 'warning';
        message = fieldWarning.error;
        points = weight * 0.5;
        warningCount++;
      } else if (hasValue(value)) {
        // Field is present and valid → full credit
        status = 'pass';
        points = weight;
        passedCount++;
      } else {
        // Field is missing
        status = 'missing';
        message = `${attribute} is not provided`;
        points = 0;
        // Missing optional fields should not carry a penalty — they simply
        // contribute 0 out of their possible weight. We still add the weight
        // to the total so the overall score reflects completeness.
      }

      if (hasValue(value)) {
        fieldsWithValue++;
      }

      totalWeightedScore += points;
      totalWeight += weight;
      totalFieldsChecked++;

      catWeightedScore += points;
      catWeight += weight;

      fieldResults.push({
        attribute,
        requirement,
        status,
        value: hasValue(value) ? value : null,
        message,
        description,
      });
    }

    const catScore = catWeight > 0 ? Math.round((catWeightedScore / catWeight) * 100) : 0;

    categoryScores.push({
      key: categoryKey,
      label: config.label,
      order: config.order,
      score: catScore,
      fields: fieldResults,
    });
  }

  // Sort categories by their configured display order
  categoryScores.sort((a, b) => a.order - b.order);

  // If absolutely no data was found, short-circuit
  if (fieldsWithValue === 0) {
    return {
      overall: 0,
      grade: 'Poor',
      errorCount,
      warningCount,
      passedCount,
      totalFieldsChecked,
      categoryScores,
      noDataFound: true,
    };
  }

  const overall = totalWeight > 0 ? Math.round((totalWeightedScore / totalWeight) * 100) : 0;

  return {
    overall,
    grade: resolveGrade(overall),
    errorCount,
    warningCount,
    passedCount,
    totalFieldsChecked,
    categoryScores,
    noDataFound: false,
  };
}
