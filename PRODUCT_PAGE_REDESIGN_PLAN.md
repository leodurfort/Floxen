# Product Mapping Page Redesign - Implementation Plan

## Overview
Adapt the individual product mapping page (`/shops/[id]/products/[pid]/mapping`) to match the Setup page design, using semantic HTML tables with sticky headers, Radix tooltips, and improved UX.

## Decisions Summary

| Feature | Decision |
|---------|----------|
| Column Structure | 4 columns: OpenAI Field, Status, Mapping Source, Preview Value |
| Mapping Column Name | "Mapping Source" (different from Setup's "WooCommerce Mapping") |
| Preview Column Name | "Preview Value" (unified with Setup) |
| Custom Override Indicator | Move to Status column (badge next to requirement badge) |
| Static Value Input | Option A: Input inside dropdown panel |
| Dropdown Implementation | Option 2: Extract to `ProductMappingSelector.tsx` |
| Validation Errors | Keep both (inline per-field + banner at top) |
| Toolbar Content | Search bar only (in first column) |

---

## Files Impact Analysis

### Files to CREATE (3 new files)

| File | Purpose | Lines (est.) |
|------|---------|--------------|
| `components/setup/ProductMappingSelector.tsx` | Extracted dropdown with static value input | ~280 |
| `components/setup/ProductFieldMappingTable.tsx` | Table wrapper (like FieldMappingTable) | ~120 |
| `components/setup/ProductFieldMappingTableSkeleton.tsx` | Loading skeleton | ~80 |

### Files to MODIFY (2 files)

| File | Changes |
|------|---------|
| `components/setup/ProductFieldMappingRow.tsx` | Convert from grid div to `<tr>`, use new ProductMappingSelector, add Status column |
| `app/shops/[id]/products/[pid]/mapping/page.tsx` | Use new ProductFieldMappingTable, update search, add skeleton |

### Files UNCHANGED (reused as-is)

| File | Reused For |
|------|------------|
| `components/ui/Tooltip.tsx` | All tooltips |
| `components/ui/DescriptionPopover.tsx` | Truncated descriptions |
| `lib/wooCommerceFields.ts` | Field utilities |
| `hooks/useFieldMappingsQuery.ts` | All data fetching |
| `app/globals.css` | Sticky header CSS (already has `.field-mapping-table` rules) |

---

## Phase 1: Create ProductMappingSelector Component

### File: `apps/web/src/components/setup/ProductMappingSelector.tsx`

**Purpose:** Reusable dropdown handling:
- WooCommerce field selection
- "No mapping" option (exclude field)
- "Static value" option with inline input
- Search filtering
- Validation

**Props Interface:**
```typescript
interface ProductMappingSelectorProps {
  // Current state
  value: string | null;                    // Selected WooCommerce field or null
  staticValue: string | null;              // Current static value (if in static mode)
  isStaticMode: boolean;                   // Whether static value is active

  // Callbacks
  onFieldSelect: (field: string | null) => void;  // null = "no mapping"
  onStaticValueSave: (value: string) => void;
  onReset: () => void;

  // Configuration
  spec: OpenAIFieldSpec;                   // For validation
  shopMapping: string | null;              // Shop default (for reset)
  wooFields: WooCommerceField[];
  wooFieldsLoading: boolean;
  hasOverride: boolean;                    // Show reset button
  allowStaticOverride: boolean;            // Whether static values allowed
  isLockedField: boolean;                  // Hide WooCommerce fields list
}
```

**Dropdown Structure (with static value inline):**
```
┌─────────────────────────────────────┐
│ [Selected: Product Name      ▼]     │  ← Trigger button
└─────────────────────────────────────┘

When open:
┌─────────────────────────────────────┐
│ 🔍 Search fields...                 │  ← Search input
├─────────────────────────────────────┤
│ ✕ No mapping (exclude field)        │  ← Only if shop has mapping
├─────────────────────────────────────┤
│ + Set Static Value                  │  ← Expandable section
│ ┌─────────────────────────────────┐ │
│ │ [Enter value...        ] [✓]   │ │  ← Inline input (when expanded)
│ │ Format: Max 70 characters       │ │  ← Validation hint
│ │ ✗ Invalid: exceeds max length   │ │  ← Error (if any)
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ Product Name                        │  ← WooCommerce fields
│   name                              │
│ Product SKU                         │
│   sku                               │
│ ...                                 │
└─────────────────────────────────────┘
```

**Key Behaviors:**
1. Click "Set Static Value" → expands inline input (doesn't close dropdown)
2. Type in input → live validation feedback
3. Click ✓ or press Enter → saves if valid, closes dropdown
4. Click elsewhere → collapses static section, keeps dropdown open
5. Click outside dropdown → closes everything
6. Reset button appears below dropdown when `hasOverride` is true

---

## Phase 2: Create ProductFieldMappingTable Component

### File: `apps/web/src/components/setup/ProductFieldMappingTable.tsx`

**Purpose:** Table wrapper matching FieldMappingTable structure

**Props Interface:**
```typescript
interface ProductFieldMappingTableProps {
  categories: CategoryGroup[];
  shopMappings: Record<string, string | null>;
  productOverrides: ProductFieldOverrides;
  resolvedValues: Record<string, any>;
  onOverrideChange: (attribute: string, override: ProductFieldOverride | null) => void;
  onEnableSearchChange: (enableSearch: boolean) => void;
  previewProductJson: any | null;
  previewShopData: any | null;
  wooFields: WooCommerceField[];
  wooFieldsLoading: boolean;
  feedEnableSearch?: boolean;
  shopDefaultEnableSearch?: boolean;
  validationErrors?: Record<string, string[]>;
  // Toolbar
  searchElement?: ReactNode;
}
```

**Structure:**
```tsx
<div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
  <div className="overflow-auto max-h-[calc(100vh-280px)]">
    <table className="w-full field-mapping-table">
      <thead>
        {/* Toolbar Row - search only, spans 4 columns */}
        <tr className="toolbar-row">
          <th colSpan={4}>{searchElement}</th>
        </tr>

        {/* Column Headers */}
        <tr className="column-headers">
          <th>OpenAI Field</th>
          <th>Status</th>
          <th>Mapping Source</th>
          <th>Preview Value</th>
        </tr>
      </thead>

      <tbody>
        {categories.map(category => (
          <Fragment key={category.id}>
            {/* Section Header */}
            <tr className="section-header">
              <td colSpan={4}>{category.label} ({category.fields.length} fields)</td>
            </tr>

            {/* Field Rows */}
            {category.fields.map(spec => (
              <ProductFieldMappingRow ... />
            ))}
          </Fragment>
        ))}
      </tbody>
    </table>
  </div>
</div>
```

**Column Widths:**
| Column | Width | Notes |
|--------|-------|-------|
| OpenAI Field | `w-[30%] min-w-[250px]` | Same as Setup |
| Status | `w-[120px] min-w-[120px]` | Wider than Setup (55px) to fit "Custom" badge |
| Mapping Source | `w-[280px] min-w-[280px]` | Wider than Setup (145px) for static value display |
| Preview Value | `w-[265px] min-w-[265px]` | Same as Setup |

---

## Phase 3: Refactor ProductFieldMappingRow

### File: `apps/web/src/components/setup/ProductFieldMappingRow.tsx`

**Changes:**
1. Convert outer `<div>` with grid → `<tr>` with `<td>` cells
2. Remove inline dropdown logic → use `ProductMappingSelector`
3. Add Status column (column 2) with requirement badge + "Custom" badge
4. Use `Tooltip` component instead of CSS hover tooltips
5. Use `DescriptionPopover` for truncated descriptions
6. Keep validation error display in Preview column

**New Structure:**
```tsx
<tr className={`border-b border-gray-200 align-top ${
  hasOverride ? 'bg-[#FA7315]/5 hover:bg-[#FA7315]/10' : 'hover:bg-gray-50'
}`}>
  {/* Column 1: OpenAI Field */}
  <td className="py-4 px-4">
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-gray-900 font-medium">{spec.attribute}</span>
        {/* Info icons with Tooltip */}
      </div>
      <DescriptionPopover
        description={spec.description}
        example={spec.example}
        values={spec.supportedValues}
      />
    </div>
  </td>

  {/* Column 2: Status */}
  <td className="py-4 px-4">
    <div className="flex flex-col gap-1">
      <StatusBadge status={spec.requirement} />
      {hasOverride && (
        <span className="text-xs px-2 py-0.5 rounded bg-[#FA7315]/10 text-[#FA7315] border border-[#FA7315]/30">
          Custom
        </span>
      )}
    </div>
  </td>

  {/* Column 3: Mapping Source */}
  <td className="py-4 px-4">
    {isReadOnly ? (
      <Tooltip content={...}>
        <div className="...">Read-only display</div>
      </Tooltip>
    ) : isEnableSearchField ? (
      <select>...</select>
    ) : (
      <ProductMappingSelector ... />
    )}
  </td>

  {/* Column 4: Preview Value */}
  <td className="py-4 px-4">
    <Tooltip content={fullValue}>
      <div className={`... ${!isValid ? 'border-amber-300' : ''}`}>
        {previewDisplay}
      </div>
    </Tooltip>
    {!isValid && <span className="text-xs text-amber-600">{error}</span>}
  </td>
</tr>
```

**Logic to PRESERVE (move to component or keep):**
- `isEnableSearchField` handling (dropdown stays inline, not in ProductMappingSelector)
- `isReadOnly` detection using `isProductEditable(spec)`
- Validation error display (both client and server)
- `feedEnableSearch` column logic (not overrides)
- Reset to shop default button

**Logic to MOVE to ProductMappingSelector:**
- Dropdown open/close state
- Search query state
- Static value draft state
- Static value validation
- Field filtering
- handleDropdownChange, handleStaticValueSave

---

## Phase 4: Update mapping/page.tsx

### File: `apps/web/src/app/shops/[id]/products/[pid]/mapping/page.tsx`

**Changes:**
1. Replace inline grid with `ProductFieldMappingTable`
2. Add skeleton loading state using `ProductFieldMappingTableSkeleton`
3. Move search element into table toolbar
4. Update search to include `spec.example`
5. Keep: header, breadcrumb, validation banner, saving indicators

**New Structure:**
```tsx
return (
  <div className="min-h-screen bg-[#F9FAFB]">
    <div className="p-4">
      {/* Breadcrumb */}
      <div className="mb-4">...</div>

      {/* Header with title, override count, validation banner */}
      <div className="mb-6">
        <h1>{productTitle}</h1>
        <p>Customize field mappings...</p>
        {/* Validation errors banner */}
        {/* Saving indicator */}
      </div>

      {/* Table with integrated search */}
      <ProductFieldMappingTable
        categories={categories}
        shopMappings={shopMappings}
        productOverrides={productOverrides}
        ...
        searchElement={
          <div className="relative">
            <svg>...</svg>
            <input
              value={searchQuery}
              onChange={...}
              placeholder="Search fields..."
            />
          </div>
        }
      />
    </div>
  </div>
);
```

---

## Phase 5: CSS Adjustments

### File: `apps/web/src/app/globals.css`

**No changes needed** - the existing `.field-mapping-table` CSS rules will work for both tables.

The sticky header positions will work because:
- Toolbar row: `top: 0`, `z-index: 30`
- Column headers: `top: 49px`, `z-index: 20`
- Section headers: `top: 90px`, `z-index: 10`

---

## Implementation Checklist

### Phase 1: ProductMappingSelector (~280 lines)
- [ ] Create file with Props interface
- [ ] Implement dropdown trigger button
- [ ] Implement search input
- [ ] Implement "No mapping" option
- [ ] Implement "Static Value" expandable section
- [ ] Implement inline static value input with ✓ button
- [ ] Implement validation feedback (format hint + error)
- [ ] Implement WooCommerce fields list
- [ ] Implement click-outside to close
- [ ] Implement Reset button (outside dropdown)
- [ ] Test: selecting field, static value, no mapping, reset

### Phase 2: ProductFieldMappingTable (~120 lines)
- [ ] Create file with Props interface
- [ ] Implement table structure with thead/tbody
- [ ] Implement toolbar row (search only)
- [ ] Implement column headers row
- [ ] Implement section headers
- [ ] Implement field rows using ProductFieldMappingRow
- [ ] Test: renders correctly, sticky headers work

### Phase 3: ProductFieldMappingTableSkeleton (~80 lines)
- [ ] Create loading skeleton matching table structure
- [ ] Match column widths
- [ ] Animate with pulse

### Phase 4: Refactor ProductFieldMappingRow
- [ ] Convert outer div to `<tr>`
- [ ] Convert inner divs to `<td>` cells
- [ ] Add Status column (requirement + custom badge)
- [ ] Replace inline dropdown with ProductMappingSelector
- [ ] Keep enable_search dropdown inline
- [ ] Keep read-only field display
- [ ] Replace CSS tooltips with Radix Tooltip
- [ ] Add DescriptionPopover for descriptions
- [ ] Keep validation error display
- [ ] Test: all field types render correctly
- [ ] Test: overrides work (mapping, static, no-mapping)
- [ ] Test: enable_search toggle works
- [ ] Test: validation errors display

### Phase 5: Update mapping/page.tsx
- [ ] Import new components
- [ ] Add loading skeleton
- [ ] Replace grid with ProductFieldMappingTable
- [ ] Move search to searchElement prop
- [ ] Update search to include spec.example
- [ ] Keep header, breadcrumb, validation banner
- [ ] Test: full page flow works
- [ ] Test: search filters correctly
- [ ] Test: sticky headers work

---

## Testing Checklist

### Functional Tests
- [ ] Select WooCommerce field → saves override, shows in preview
- [ ] Select "No mapping" → field excluded, preview empty
- [ ] Enter static value → validates, saves on ✓
- [ ] Invalid static value → shows error, ✓ disabled
- [ ] Press Enter in static input → saves if valid
- [ ] Reset to shop default → removes override
- [ ] enable_search toggle → updates correctly
- [ ] Search filters by attribute, description, example
- [ ] Validation errors show inline + in banner

### Visual Tests
- [ ] 4 columns align correctly
- [ ] "Custom" badge appears in Status column
- [ ] Override rows have orange tint background
- [ ] Sticky headers work (toolbar, columns, sections)
- [ ] Tooltips appear with correct styling
- [ ] DescriptionPopover works for long descriptions
- [ ] Loading skeleton matches table structure

### Edge Cases
- [ ] Field with no shop mapping (no "No mapping" option)
- [ ] Locked field (read-only display)
- [ ] Feature-disabled field (shows "Coming soon")
- [ ] Auto-populated field (shows "Auto-populated")
- [ ] Shop-managed field (shows "Managed in Shops page")
- [ ] Very long static value (truncates in preview)
- [ ] Empty product (no WooCommerce data)

---

## Execution Order

1. **Create ProductMappingSelector.tsx** - New component, no dependencies
2. **Create ProductFieldMappingTableSkeleton.tsx** - Simple, no dependencies
3. **Create ProductFieldMappingTable.tsx** - Depends on ProductFieldMappingRow (use existing temporarily)
4. **Refactor ProductFieldMappingRow.tsx** - Convert to `<tr>`, integrate ProductMappingSelector
5. **Update mapping/page.tsx** - Final integration

This order minimizes risk:
- Each step can be tested independently
- ProductFieldMappingRow refactor is the riskiest, done after helpers are ready
- page.tsx update is last, simple integration

---

## Rollback Plan

If issues arise:
1. ProductMappingSelector is new → just delete if broken
2. ProductFieldMappingTable is new → just delete if broken
3. ProductFieldMappingRow refactor → git checkout to restore original
4. page.tsx → git checkout to restore original

Keep git commits granular (one per phase) for easy rollback.
