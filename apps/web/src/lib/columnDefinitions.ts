import {
  OPENAI_FEED_SPEC,
  CATEGORY_CONFIG,
  type OpenAIFieldSpec,
  type OpenAIFieldCategory,
} from '@productsynch/shared';

export interface ProductData {
  id: string;
  isValid: boolean;
  validationErrors: Record<string, string[]> | null;
  productFieldOverrides: Record<string, unknown> | null;
  openaiAutoFilled: Record<string, unknown> | null;
  feedEnableSearch: boolean;
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

const CUSTOM_CATEGORY_ORDER = 0;

function getOpenAIValue(product: ProductData, attribute: string): unknown {
  return product.openaiAutoFilled?.[attribute] ?? null;
}

function parseSupportedValues(spec: OpenAIFieldSpec): string[] | undefined {
  if (!spec.supportedValues) return undefined;
  return spec.supportedValues.split(',').map((v) => v.trim().toLowerCase());
}

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

function isSortable(spec: OpenAIFieldSpec, dataType: ColumnDataType): boolean {
  if (spec.dataType.toLowerCase().includes('array')) return false;
  if (dataType === 'image') return false;
  return true;
}

function isFilterable(spec: OpenAIFieldSpec): boolean {
  if (spec.dataType.toLowerCase().includes('array')) return false;
  if (spec.attribute === 'raw_review_data') return false;
  return true;
}

const DEFAULT_COLUMN_ORDER: string[] = [
  'checkbox',        // Selection (always first)
  'id',              // OpenAI: Basic Product Data
  'image_link',      // OpenAI: Media
  'title',           // OpenAI: Basic Product Data
  'enable_search',   // OpenAI: Flags
  'overrides',       // Custom: Override count
  'feedStatus',      // Custom: Feed status (In Feed / Issues / Excluded)
  'updatedAt',       // Custom: Last modified
  'actions',
];

const DEFAULT_VISIBLE_COLUMNS = new Set(DEFAULT_COLUMN_ORDER);

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

function formatLabel(attribute: string): string {
  return attribute
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

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
    id: 'feedStatus',
    label: 'Feed Status',
    dataType: 'boolean',
    sortable: true,
    filterable: false,
    defaultVisible: true,
    category: 'Status',
    categoryOrder: CUSTOM_CATEGORY_ORDER,
    getValue: (product: ProductData) => product.isValid,
    formatValue: (value) => (value ? 'Yes' : 'No'), // Default format, but renderCellValue handles display
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

export const ALL_COLUMNS: ColumnDefinition[] = [
  ...CUSTOM_COLUMNS,
  ...generateOpenAIColumns(),
];

export const COLUMN_MAP: Map<string, ColumnDefinition> = new Map(
  ALL_COLUMNS.map((col) => [col.id, col])
);

export function getDefaultVisibleColumns(): string[] {
  return DEFAULT_COLUMN_ORDER.filter((id) => COLUMN_MAP.has(id));
}

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

export function getColumnValue(product: ProductData, columnId: string): unknown {
  const col = COLUMN_MAP.get(columnId);
  if (!col) return null;
  return col.getValue(product);
}

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

const STORAGE_KEY_PREFIX = 'productsynch:catalog:columns:';

export function getStoredColumns(shopId: string): string[] {
  if (typeof window === 'undefined') {
    return getDefaultVisibleColumns();
  }
  const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${shopId}`);
  if (stored) {
    try {
      const columns = JSON.parse(stored) as string[];
      // Migrate old column IDs: isValid -> feedStatus
      const migratedColumns = columns.map((id) => (id === 'isValid' ? 'feedStatus' : id));
      const validColumns = migratedColumns.filter((id) => COLUMN_MAP.has(id));
      if (validColumns.length > 0) {
        // Save migrated columns back to localStorage
        if (columns.includes('isValid')) {
          saveStoredColumns(shopId, validColumns);
        }
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
