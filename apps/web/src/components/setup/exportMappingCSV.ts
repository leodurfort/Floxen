/**
 * TEMPORARY FEATURE: Export Mapping to CSV
 * 
 * This is a temporary utility to export field mappings to CSV format.
 * Format: 3 columns (openai, woocommerce, preview), 70 rows
 */

import { OpenAIFieldSpec, OPENAI_FEED_SPEC } from '@productsynch/shared';
import { extractFieldValue, formatFieldValue } from '@/lib/wooCommerceFields';

export interface ExportCSVData {
  mappings: Record<string, string | null>;
  previewProductJson: any | null;
  previewShopData?: any | null;
  productName: string;
}

/**
 * Generate CSV content for field mappings export
 */
export function generateMappingCSV({
  mappings,
  previewProductJson,
  previewShopData,
}: Omit<ExportCSVData, 'productName'>): string {
  // CSV header
  const header = 'openai,woocommerce,preview\n';

  // Generate rows for all 70 fields
  const rows = OPENAI_FEED_SPEC.map((spec: OpenAIFieldSpec) => {
    const openaiField = spec.attribute;
    const wooCommerceField = mappings[spec.attribute] || '';
    
    // Extract preview value if mapping exists
    let previewValue = '';
    if (mappings[spec.attribute] && previewProductJson) {
      const isToggleField = spec.attribute === 'enable_search' || spec.attribute === 'enable_checkout';
      if (!isToggleField) {
        const extractedValue = extractFieldValue(
          previewProductJson,
          mappings[spec.attribute]!,
          previewShopData
        );
        previewValue = formatFieldValue(extractedValue);
      } else {
        // For toggle fields, use true/false as per OpenAI spec
        previewValue = mappings[spec.attribute] === 'ENABLED' ? 'true' : 'false';
      }
    }

    // Escape CSV values (handle commas, quotes, newlines)
    const escapeCSV = (value: string): string => {
      if (!value) return '';
      // If value contains comma, quote, or newline, wrap in quotes and escape quotes
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    return `${escapeCSV(openaiField)},${escapeCSV(wooCommerceField)},${escapeCSV(previewValue)}`;
  });

  return header + rows.join('\n');
}

/**
 * Download CSV file
 */
export function downloadMappingCSV(data: ExportCSVData): void {
  const csvContent = generateMappingCSV(data);
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  // Clean product name for filename (remove special characters)
  const cleanProductName = data.productName
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase()
    .substring(0, 50); // Limit length
  
  link.setAttribute('href', url);
  link.setAttribute('download', `export mapping ${cleanProductName}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  URL.revokeObjectURL(url);
}

