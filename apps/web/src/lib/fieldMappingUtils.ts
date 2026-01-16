import { REQUIRED_FIELDS } from '@productsynch/shared';

export interface FieldMappingProgress {
  requiredFieldsMapped: number;
  totalRequiredFields: number;
  isComplete: boolean;
}

/**
 * Calculate how many required fields have been mapped
 */
export function calculateFieldMappingProgress(
  mappings: Record<string, string | null>
): FieldMappingProgress {
  const requiredFieldsMapped = REQUIRED_FIELDS.filter(
    (spec) => mappings[spec.attribute] != null && mappings[spec.attribute] !== ''
  ).length;
  const totalRequiredFields = REQUIRED_FIELDS.length;

  return {
    requiredFieldsMapped,
    totalRequiredFields,
    isComplete: requiredFieldsMapped === totalRequiredFields,
  };
}
