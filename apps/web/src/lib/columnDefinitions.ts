/**
 * Column Definitions for Product Catalog Table
 *
 * Defines all 76 columns (70 OpenAI attributes + 6 custom columns)
 * Used for dynamic column rendering, filtering, and sorting.
 */

import {
  OPENAI_FEED_SPEC,
  CATEGORY_CONFIG,
  type OpenAIFieldSpec,
  type OpenAIFieldCategory,
} from '@productsynch/shared';

// Product type from API (simplified for column definitions)
export interface ProductData {
  id: string;
  syncStatus: string;
  isValid: boolean;
  validationErrors: string[] | null;
  productFieldOverrides: Record<string, unknown> | null;
  openaiAutoFilled: Record<string, unknown> | null;
  wooRawJson: Record<string, unknown> | null;
  updatedAt: string;
}

export type ColumnDataType = 'string' | 'number' | 'boolean' | 'enum' | 'date' | 'url' | 'image';

export interface ColumnDefinition {
  id: string;
  label: string;
  openaiAttribute?: string; // Maps to OPENAI_FEED_SPEC attribute (undefined for custom columns)
  dataType: ColumnDataType;
  sortable: boolean;
  filterable: boolean;
  defaultVisible: boolean;
  category: string;
  categoryOrder: number;
  supportedValues?: string[]; // For enum types
  getValue: (product: ProductData) => unknown;
  formatValue?: (value: unknown) => string; // Format for display
}

// Custom column category order (show first)
const CUSTOM_CATEGORY_ORDER = 0;

// Helper to extract value from openaiAutoFilled
function getOpenAIValue(product: ProductData, attribute: string): unknown {
  return product.openaiAutoFilled?.[attribute] ?? null;
}

// Helper to parse supported values from spec
function parseSupportedValues(spec: OpenAIFieldSpec): string[] | undefined {
  if (!spec.supportedValues) return undefined;
  return spec.supportedValues.split(',').map((v) => v.trim().toLowerCase());
}

// Helper to determine data type from spec
function getDataType(spec: OpenAIFieldSpec): ColumnDataType {
  const dt = spec.dataType.toLowerCase();

  if (dt.includes('enum') || dt.includes('boolean')) {
    return 'enum';
  }
  if (dt.includes('url') && spec.attribute.includes('image')) {
    return 'image';
  }
  if (dt.includes('url')) {
    return 'url';
  }
  if (dt.includes('integer') || dt.includes('number')) {
    return 'number';
  }
  if (dt.includes('date')) {
    return 'date';
  }
  return 'string';
}

// Helper to determine if column is sortable
function isSortable(spec: OpenAIFieldSpec, dataType: ColumnDataType): boolean {
  // Arrays and complex types are not sortable
  if (spec.dataType.toLowerCase().includes('array')) return false;
  // Images are not sortable
  if (dataType === 'image') return false;
  return true;
}

// Helper to determine if column is filterable
function isFilterable(spec: OpenAIFieldSpec): boolean {
  // Arrays and complex JSON are not filterable
  if (spec.dataType.toLowerCase().includes('array')) return false;
  if (spec.attribute === 'raw_review_data') return false;
  return true;
}

// Default visible columns in exact display order
// This order is used when user first loads the catalog
const DEFAULT_COLUMN_ORDER: string[] = [
  'checkbox',        // Selection (always first)
  'id',              // OpenAI: Basic Product Data
  'image_link',      // OpenAI: Media
  'title',           // OpenAI: Basic Product Data
  'enable_search',   // OpenAI: Flags
  'overrides',       // Custom: Override count
  'isValid',         // Custom: Validation status
  'updatedAt',       // Custom: Last modified
  'syncStatus',      // Custom: Sync status
  'actions',         // Actions (always last)
];

// Set for quick lookup of default visible columns
const DEFAULT_VISIBLE_COLUMNS = new Set(DEFAULT_COLUMN_ORDER);

// Generate column definitions from OpenAI spec
function generateOpenAIColumns(): ColumnDefinition[] {
  return OPENAI_FEED_SPEC.map((spec) => {
    const dataType = getDataType(spec);
    const categoryConfig = CATEGORY_CONFIG[spec.category as OpenAIFieldCategory];

    return {
      id: spec.attribute,
      label: formatLabel(spec.attribute),
      openaiAttribute: spec.attribute,
      dataType,
      sortable: isSortable(spec, dataType),
      filterable: isFilterable(spec),
      defaultVisible: DEFAULT_VISIBLE_COLUMNS.has(spec.attribute),
      category: categoryConfig?.label || spec.category,
      categoryOrder: categoryConfig?.order || 99,
      supportedValues: parseSupportedValues(spec),
      getValue: (product: ProductData) => getOpenAIValue(product, spec.attribute),
      formatValue: getFormatFunction(dataType),
    };
  });
}

// Format attribute name to display label
function formatLabel(attribute: string): string {
  return attribute
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Get format function based on data type
function getFormatFunction(dataType: ColumnDataType): ((value: unknown) => string) | undefined {
  switch (dataType) {
    case 'boolean':
    case 'enum':
      return (value) => {
        if (value === null || value === undefined) return '-';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        return String(value);
      };
    case 'number':
      return (value) => {
        if (value === null || value === undefined) return '-';
        return String(value);
      };
    case 'date':
      return (value) => {
        if (!value) return '-';
        try {
          return new Date(String(value)).toLocaleDateString();
        } catch {
          return String(value);
        }
      };
    case 'url':
    case 'image':
      return (value) => {
        if (!value) return '-';
        return String(value);
      };
    default:
      return undefined;
  }
}

// Custom column definitions
const CUSTOM_COLUMNS: ColumnDefinition[] = [
  {
    id: 'checkbox',
    label: 'Selection',
    dataType: 'boolean',
    sortable: false,
    filterable: false,
    defaultVisible: true,
    category: 'Selection',
    categoryOrder: CUSTOM_CATEGORY_ORDER,
    getValue: () => null, // Handled specially in UI
  },
  {
    id: 'syncStatus',
    label: 'Sync Status',
    dataType: 'enum',
    sortable: true,
    filterable: true,
    defaultVisible: true,
    category: 'Status',
    categoryOrder: CUSTOM_CATEGORY_ORDER,
    supportedValues: ['pending', 'syncing', 'completed', 'failed', 'paused'],
    getValue: (product: ProductData) => product.syncStatus,
    formatValue: (value) => {
      if (!value) return '-';
      return String(value).charAt(0).toUpperCase() + String(value).slice(1).toLowerCase();
    },
  },
  {
    id: 'overrides',
    label: 'Overrides',
    dataType: 'number',
    sortable: true,
    filterable: true,
    defaultVisible: true,
    category: 'Status',
    categoryOrder: CUSTOM_CATEGORY_ORDER,
    getValue: (product: ProductData) => {
      if (!product.productFieldOverrides) return 0;
      return Object.keys(product.productFieldOverrides).length;
    },
    formatValue: (value) => {
      const count = Number(value) || 0;
      return count === 0 ? '-' : String(count);
    },
  },
  {
    id: 'isValid',
    label: 'Valid',
    dataType: 'boolean',
    sortable: true,
    filterable: true,
    defaultVisible: true,
    category: 'Status',
    categoryOrder: CUSTOM_CATEGORY_ORDER,
    supportedValues: ['true', 'false'],
    getValue: (product: ProductData) => product.isValid,
    formatValue: (value) => (value ? 'Yes' : 'No'),
  },
  {
    id: 'updatedAt',
    label: 'Last Modified',
    dataType: 'date',
    sortable: true,
    filterable: false,
    defaultVisible: true,
    category: 'Status',
    categoryOrder: CUSTOM_CATEGORY_ORDER,
    getValue: (product: ProductData) => product.updatedAt,
    formatValue: getFormatFunction('date'),
  },
  {
    id: 'actions',
    label: 'Actions',
    dataType: 'string',
    sortable: false,
    filterable: false,
    defaultVisible: true,
    category: 'Actions',
    categoryOrder: 999, // Show last
    getValue: () => null, // Handled specially in UI
  },
];

// All column definitions (custom + OpenAI)
export const ALL_COLUMNS: ColumnDefinition[] = [
  ...CUSTOM_COLUMNS,
  ...generateOpenAIColumns(),
];

// Map of column ID to definition for quick lookup
export const COLUMN_MAP: Map<string, ColumnDefinition> = new Map(
  ALL_COLUMNS.map((col) => [col.id, col])
);

// Get default visible column IDs in the correct display order
export function getDefaultVisibleColumns(): string[] {
  // Return default columns in their exact defined order
  return DEFAULT_COLUMN_ORDER.filter((id) => COLUMN_MAP.has(id));
}

// Get columns grouped by category
export function getColumnsByCategory(): Map<string, ColumnDefinition[]> {
  const grouped = new Map<string, ColumnDefinition[]>();

  // Sort columns by category order, then by label
  const sorted = [...ALL_COLUMNS].sort((a, b) => {
    if (a.categoryOrder !== b.categoryOrder) {
      return a.categoryOrder - b.categoryOrder;
    }
    return a.label.localeCompare(b.label);
  });

  for (const col of sorted) {
    const existing = grouped.get(col.category) || [];
    existing.push(col);
    grouped.set(col.category, existing);
  }

  return grouped;
}

// Get column value from product
export function getColumnValue(product: ProductData, columnId: string): unknown {
  const col = COLUMN_MAP.get(columnId);
  if (!col) return null;
  return col.getValue(product);
}

// Format column value for display
export function formatColumnValue(product: ProductData, columnId: string): string {
  const col = COLUMN_MAP.get(columnId);
  if (!col) return '-';

  const value = col.getValue(product);

  if (col.formatValue) {
    return col.formatValue(value);
  }

  if (value === null || value === undefined) return '-';
  return String(value);
}

// LocalStorage helpers
const STORAGE_KEY_PREFIX = 'productsynch:catalog:columns:';

export function getStoredColumns(shopId: string): string[] {
  if (typeof window === 'undefined') {
    return getDefaultVisibleColumns();
  }

  const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${shopId}`);
  if (stored) {
    try {
      const columns = JSON.parse(stored) as string[];
      // Validate that all stored columns still exist
      const validColumns = columns.filter((id) => COLUMN_MAP.has(id));
      if (validColumns.length > 0) {
        return validColumns;
      }
    } catch {
      // Invalid JSON, return defaults
    }
  }
  return getDefaultVisibleColumns();
}

export function saveStoredColumns(shopId: string, columns: string[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${shopId}`, JSON.stringify(columns));
  }
}
