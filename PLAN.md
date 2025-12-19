# Product-Level Field Mapping Override Feature - Implementation Plan

## Summary of Decisions

Based on clarifications:
1. **Locked Fields**: Allow static values (not custom mappings) for `title`, `description`, `product_category` only. Other 8 locked fields remain completely uneditable.
2. **Resolution Timing**: Sync time (Option A) - `openaiAutoFilled` stores resolved values, requires re-processing on override changes.
3. **Propagation**: "Apply to all" clears/resets all product-level overrides for that field.
4. **Toggle Fields**: Keep as simple toggles (`feedEnableSearch`, `feedEnableCheckout`), not part of the override system.
5. **Static Values**: Always strings matching final feed format (e.g., "79.99 USD" not "79.99").
6. **Validation**: Only field's own rules (data type, enum, format) - no cross-field dependencies.
7. **AI Cleanup**: Remove `isAiEnrichable`, `AI_ENRICHABLE_FIELDS`, and related references.
8. **Component**: `ProductFieldMappingRow` wrapper that uses `FieldMappingRow` for preview column.

---

## Phase 1: Database Schema & Shared Package Updates

### 1.1 Database Migration

**File:** `apps/api/prisma/schema.prisma`

Add to `Product` model:
```prisma
// Product-level field mapping overrides (sparse - only stores differences from shop)
// Format: { "fieldAttribute": { type: "mapping", value: "woo.field.path" } | { type: "static", value: "hardcoded" } }
productFieldOverrides  Json?  @default("{}") @map("product_field_overrides")
```

**Migration:** Create migration file that adds the column with default empty JSON object.

### 1.2 Shared Package Updates

**File:** `packages/shared/src/openai-feed-spec.ts`

Changes:
1. Remove `isAiEnrichable` from `OpenAIFieldSpec` interface
2. Remove `isAiEnrichable: true/false` from all 70 field definitions
3. Remove `AI_ENRICHABLE_FIELDS` constant
4. Remove AI-related stats from `FIELD_STATS`
5. Add new constants:

```typescript
// Fields that allow static value overrides at product level (subset of locked fields)
export const STATIC_OVERRIDE_ALLOWED_LOCKED_FIELDS = new Set(['title', 'description', 'product_category']);

// Product override types
export type ProductOverrideType = 'mapping' | 'static';

export interface ProductFieldOverride {
  type: ProductOverrideType;
  value: string;
}

export type ProductFieldOverrides = Record<string, ProductFieldOverride>;
```

**File:** `packages/shared/src/index.ts`

Export new types and constants.

### 1.3 Static Value Validation Utilities

**File:** `packages/shared/src/validation/staticValueValidator.ts` (NEW)

Create field-level validation for static values:

```typescript
export interface StaticValueValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateStaticValue(
  attribute: string,
  value: string
): StaticValueValidationResult {
  const spec = OPENAI_FEED_SPEC.find(s => s.attribute === attribute);
  if (!spec) {
    return { isValid: false, error: 'Unknown field' };
  }

  // Validate based on dataType and supportedValues
  switch (spec.dataType) {
    case 'Enum':
      return validateEnum(value, spec.supportedValues);
    case 'URL':
      return validateUrl(value);
    case 'Number + currency':
      return validatePriceWithCurrency(value);
    case 'Integer':
      return validateInteger(value);
    case 'Number':
      return validateNumber(value);
    case 'Date':
      return validateDate(value);
    // ... other types
    default:
      return validateString(value, spec.validationRules);
  }
}

function validateEnum(value: string, supportedValues: string | null): StaticValueValidationResult {
  if (!supportedValues) return { isValid: true };
  const allowed = supportedValues.split(',').map(s => s.trim());
  if (!allowed.includes(value)) {
    return { isValid: false, error: `Must be one of: ${supportedValues}` };
  }
  return { isValid: true };
}

function validatePriceWithCurrency(value: string): StaticValueValidationResult {
  // Must match pattern like "79.99 USD"
  const priceRegex = /^\d+(\.\d{1,2})?\s+[A-Z]{3}$/;
  if (!priceRegex.test(value)) {
    return { isValid: false, error: 'Must be in format "79.99 USD" (number + ISO 4217 currency code)' };
  }
  return { isValid: true };
}

// ... other validators
```

---

## Phase 2: API Endpoints

### 2.1 Product Field Overrides Endpoints

**File:** `apps/api/src/controllers/productController.ts`

Add new endpoints:

#### GET `/api/v1/shops/:shopId/products/:productId/field-overrides`

Returns current product overrides:
```typescript
{
  overrides: ProductFieldOverrides,  // Current product overrides
  shopMappings: Record<string, string | null>,  // For reference
  resolvedValues: Record<string, any>  // Current openaiAutoFilled values
}
```

#### PUT `/api/v1/shops/:shopId/products/:productId/field-overrides`

Update product overrides:
```typescript
// Request body
{
  overrides: ProductFieldOverrides  // Complete override object (replaces existing)
}

// Response
{
  success: boolean,
  overrides: ProductFieldOverrides,
  validationErrors?: Record<string, string>  // If any static values invalid
}
```

Logic:
1. Validate static values using `validateStaticValue()`
2. If any invalid, return 400 with validation errors
3. Check field is not fully locked (only `title`, `description`, `product_category` allowed for locked fields)
4. Update `product.productFieldOverrides`
5. Trigger re-processing of product (call AutoFillService, update `openaiAutoFilled`)
6. Return updated overrides

#### DELETE `/api/v1/shops/:shopId/products/:productId/field-overrides/:attribute`

Reset single field to shop default:
```typescript
// Response
{
  success: boolean,
  overrides: ProductFieldOverrides  // Updated overrides after removal
}
```

Logic:
1. Remove the attribute from `productFieldOverrides`
2. Trigger re-processing of product
3. Return updated overrides

### 2.2 Update Shop Field Mappings Endpoint

**File:** `apps/api/src/controllers/shopController.ts`

Modify `PUT /api/v1/shops/:shopId/field-mappings`:

Add optional body parameter:
```typescript
{
  mappings: Record<string, string | null>,
  propagationMode?: 'apply_all' | 'preserve_overrides'  // Default: 'preserve_overrides'
}
```

Logic when `propagationMode === 'apply_all'`:
1. For each changed field, clear `productFieldOverrides[attribute]` from ALL products
2. Trigger re-sync for affected products

---

## Phase 3: AutoFillService Updates

### 3.1 Modify AutoFillService to Support Product Overrides

**File:** `apps/api/src/services/autoFillService.ts`

Update `autoFillProduct()` signature:
```typescript
autoFillProduct(
  wooProduct: any,
  productFlags?: {
    enableSearch?: boolean;
    enableCheckout?: boolean;
  },
  productOverrides?: ProductFieldOverrides  // NEW parameter
): Record<string, any>
```

Update `fillField()` logic:

```typescript
private fillField(
  spec: OpenAIFieldSpec,
  wooProduct: any,
  productFlags?: {...},
  productOverrides?: ProductFieldOverrides
): any {
  // ... existing toggle field handling ...

  // NEW: Check for product-level override FIRST
  const override = productOverrides?.[spec.attribute];
  if (override) {
    if (override.type === 'static') {
      // Static value - use directly, no transform
      return override.value;
    }
    if (override.type === 'mapping') {
      // Custom mapping - override the field path but still apply transforms
      // (Only for non-locked fields)
      if (!LOCKED_FIELD_SET.has(spec.attribute)) {
        mapping = {
          ...spec.wooCommerceMapping,
          field: override.value,
        };
      }
    }
  }

  // ... rest of existing logic ...
}
```

### 3.2 Update Product Sync to Pass Overrides

**File:** `apps/api/src/workers/productSyncWorker.ts` (or wherever sync happens)

When calling `autoFillService.autoFillProduct()`, pass the product's overrides:

```typescript
const autoFilled = autoFillService.autoFillProduct(
  wooProduct,
  { enableSearch: product.feedEnableSearch, enableCheckout: product.feedEnableCheckout },
  product.productFieldOverrides as ProductFieldOverrides || {}
);
```

### 3.3 Create Re-Processing Utility

**File:** `apps/api/src/services/productReprocessService.ts` (NEW)

```typescript
export async function reprocessProduct(productId: string): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { shop: true },
  });

  if (!product) throw new Error('Product not found');

  const autoFillService = await AutoFillService.create(product.shop);
  const wooProduct = product.wooRawJson;

  const autoFilled = autoFillService.autoFillProduct(
    wooProduct,
    { enableSearch: product.feedEnableSearch, enableCheckout: product.feedEnableCheckout },
    product.productFieldOverrides as ProductFieldOverrides || {}
  );

  // Validate
  const validation = validateProduct(autoFilled, product.feedEnableCheckout);

  await prisma.product.update({
    where: { id: productId },
    data: {
      openaiAutoFilled: autoFilled,
      isValid: validation.isValid,
      validationErrors: validation.errors,
    },
  });
}

export async function reprocessProductsForField(
  shopId: string,
  attribute: string
): Promise<number> {
  // Find all products that had overrides for this field and clear them
  const products = await prisma.product.findMany({
    where: { shopId },
    select: { id: true, productFieldOverrides: true },
  });

  let count = 0;
  for (const product of products) {
    const overrides = (product.productFieldOverrides as ProductFieldOverrides) || {};
    if (overrides[attribute]) {
      delete overrides[attribute];
      await prisma.product.update({
        where: { id: product.id },
        data: { productFieldOverrides: overrides },
      });
      await reprocessProduct(product.id);
      count++;
    }
  }

  return count;
}
```

---

## Phase 4: Frontend - Product Field Mapping Page

### 4.1 Create Product Mapping Page

**File:** `apps/web/src/app/shops/[id]/products/[pid]/mapping/page.tsx` (NEW)

Page structure:
```tsx
export default function ProductMappingPage() {
  // Load product data, shop mappings, woo fields, overrides
  // Display product name in header
  // Render 3-column layout similar to setup page
  // BUT: No product selector (we're on a specific product)
  // Use ProductFieldMappingRow for each field

  return (
    <div className="min-h-screen bg-[#0b1021] pl-64">
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header with product name */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Field Mapping: {product.wooTitle}
            </h1>
            <p className="text-white/60">
              Customize field mappings for this specific product.
            </p>
          </div>

          {/* Column Headers */}
          <div className="grid grid-cols-[1fr_320px_1fr] gap-6 mb-6 pb-4 border-b border-white/20">
            <div>OpenAI Attribute</div>
            <div>Mapping Source</div>
            <div>Preview Value</div>
          </div>

          {/* Field Rows */}
          {categories.map(category => (
            <div key={category.id}>
              <h2>{category.label}</h2>
              {category.fields.map(spec => (
                <ProductFieldMappingRow
                  key={spec.attribute}
                  spec={spec}
                  shopMapping={shopMappings[spec.attribute]}
                  productOverride={overrides[spec.attribute]}
                  onOverrideChange={handleOverrideChange}
                  previewValue={resolvedValues[spec.attribute]}
                  wooFields={wooFields}
                  wooFieldsLoading={wooFieldsLoading}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 4.2 Create ProductFieldMappingRow Component

**File:** `apps/web/src/components/setup/ProductFieldMappingRow.tsx` (NEW)

```tsx
interface Props {
  spec: OpenAIFieldSpec;
  shopMapping: string | null;  // Current shop-level mapping
  productOverride: ProductFieldOverride | null;  // Product-level override
  onOverrideChange: (attribute: string, override: ProductFieldOverride | null) => void;
  previewValue: any;  // Resolved value from openaiAutoFilled
  wooFields: WooCommerceField[];
  wooFieldsLoading: boolean;
}

export function ProductFieldMappingRow({
  spec,
  shopMapping,
  productOverride,
  onOverrideChange,
  previewValue,
  wooFields,
  wooFieldsLoading,
}: Props) {
  const [staticValue, setStaticValue] = useState(
    productOverride?.type === 'static' ? productOverride.value : ''
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  // Determine override mode
  const overrideMode: 'shop_default' | 'custom_mapping' | 'static_value' =
    productOverride?.type === 'mapping' ? 'custom_mapping' :
    productOverride?.type === 'static' ? 'static_value' :
    'shop_default';

  // Check if field allows overrides
  const isLockedField = LOCKED_FIELD_SET.has(spec.attribute);
  const allowsStaticOverride = STATIC_OVERRIDE_ALLOWED_LOCKED_FIELDS.has(spec.attribute);
  const allowsCustomMapping = !isLockedField;
  const isFullyLocked = isLockedField && !allowsStaticOverride;

  // Toggle fields not part of override system
  const isToggleField = spec.attribute === 'enable_search' || spec.attribute === 'enable_checkout';

  // Row background color based on override status
  const rowBgClass = productOverride
    ? 'bg-[#5df0c0]/5 border-l-2 border-[#5df0c0]/30'
    : '';

  if (isToggleField || isFullyLocked) {
    // Render as read-only using existing FieldMappingRow
    return (
      <div className="opacity-60">
        <FieldMappingRow
          spec={spec}
          currentMapping={shopMapping}
          isUserSelected={false}
          onMappingChange={() => {}}
          previewProductJson={null}
          previewShopData={null}
          wooFields={wooFields}
          wooFieldsLoading={wooFieldsLoading}
        />
      </div>
    );
  }

  function handleModeChange(mode: 'shop_default' | 'custom_mapping' | 'static_value') {
    if (mode === 'shop_default') {
      onOverrideChange(spec.attribute, null);
    } else if (mode === 'custom_mapping') {
      // Start with shop mapping as default
      onOverrideChange(spec.attribute, { type: 'mapping', value: shopMapping || '' });
    } else if (mode === 'static_value') {
      // Keep current value, just switch mode
      onOverrideChange(spec.attribute, { type: 'static', value: staticValue });
    }
  }

  function handleCustomMappingChange(wooField: string | null) {
    if (wooField) {
      onOverrideChange(spec.attribute, { type: 'mapping', value: wooField });
    } else {
      onOverrideChange(spec.attribute, null);
    }
  }

  function handleStaticValueBlur() {
    const validation = validateStaticValue(spec.attribute, staticValue);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid value');
      return;
    }
    setValidationError(null);
    onOverrideChange(spec.attribute, { type: 'static', value: staticValue });
  }

  return (
    <div className={`grid grid-cols-[1fr_320px_1fr] gap-6 py-4 border-b border-white/5 ${rowBgClass}`}>
      {/* Column 1: OpenAI Field Info (same as FieldMappingRow) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="text-white font-medium">{spec.attribute}</span>
          <RequirementBadge requirement={spec.requirement} />
          {productOverride && (
            <span className="text-xs px-2 py-0.5 rounded bg-[#5df0c0]/20 text-[#5df0c0] border border-[#5df0c0]/30">
              Custom
            </span>
          )}
        </div>
        <p className="text-sm text-white/60">{spec.description}</p>
      </div>

      {/* Column 2: Override Controls */}
      <div className="flex flex-col gap-3">
        {/* Mode Dropdown */}
        <select
          value={overrideMode}
          onChange={(e) => handleModeChange(e.target.value as any)}
          className="w-full px-3 py-2 bg-[#1a1d29] text-white rounded-lg border border-white/10"
        >
          <option value="shop_default">Use Shop Default</option>
          {allowsCustomMapping && (
            <option value="custom_mapping">Custom WooCommerce Mapping</option>
          )}
          <option value="static_value">Set Static Value</option>
        </select>

        {/* Conditional Controls based on mode */}
        {overrideMode === 'shop_default' && (
          <div className="text-sm text-white/50 px-2">
            Inheriting: {shopMapping || 'Not mapped'}
          </div>
        )}

        {overrideMode === 'custom_mapping' && (
          <WooCommerceFieldSelector
            value={productOverride?.value || null}
            onChange={handleCustomMappingChange}
            openaiAttribute={spec.attribute}
            requirement={spec.requirement}
            fields={wooFields}
            loading={wooFieldsLoading}
          />
        )}

        {overrideMode === 'static_value' && (
          <div>
            <input
              type="text"
              value={staticValue}
              onChange={(e) => setStaticValue(e.target.value)}
              onBlur={handleStaticValueBlur}
              placeholder={spec.example}
              className={`w-full px-3 py-2 bg-[#1a1d29] text-white rounded-lg border ${
                validationError ? 'border-red-500' : 'border-white/10'
              }`}
            />
            {validationError && (
              <div className="mt-1 text-xs text-red-400">{validationError}</div>
            )}
            {spec.supportedValues && (
              <div className="mt-1 text-xs text-white/40">
                Allowed: {spec.supportedValues}
              </div>
            )}
          </div>
        )}

        {/* Reset Button */}
        {productOverride && (
          <button
            onClick={() => onOverrideChange(spec.attribute, null)}
            className="text-xs text-white/50 hover:text-[#5df0c0] self-start"
          >
            Reset to Shop Default
          </button>
        )}
      </div>

      {/* Column 3: Preview Value */}
      <div className="flex items-start pt-0">
        <div className="w-full px-4 py-3 bg-[#1a1d29] rounded-lg border border-white/10">
          <span className="text-xs text-white/80 truncate block">
            {previewValue ?? <span className="text-white/40 italic">No value</span>}
          </span>
        </div>
      </div>
    </div>
  );
}
```

### 4.3 Update Setup Page with Propagation Modal

**File:** `apps/web/src/app/shops/[id]/setup/page.tsx`

Add propagation modal when saving changed mappings:

```tsx
// Add state
const [showPropagationModal, setShowPropagationModal] = useState(false);
const [pendingChange, setPendingChange] = useState<{attribute: string, newValue: string | null} | null>(null);

// Modify handleMappingChange
async function handleMappingChange(attribute: string, wooField: string | null) {
  // Check if any products have overrides for this field
  const hasOverrides = await checkProductOverridesExist(attribute);

  if (hasOverrides) {
    setPendingChange({ attribute, newValue: wooField });
    setShowPropagationModal(true);
    return;
  }

  // No overrides, proceed normally
  await saveMappingChange(attribute, wooField, 'preserve_overrides');
}

async function handlePropagationChoice(mode: 'apply_all' | 'preserve_overrides') {
  if (!pendingChange) return;
  await saveMappingChange(pendingChange.attribute, pendingChange.newValue, mode);
  setShowPropagationModal(false);
  setPendingChange(null);
}

// Propagation Modal Component
{showPropagationModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-[#1a1d29] rounded-lg p-6 max-w-md">
      <h3 className="text-lg font-semibold text-white mb-4">
        Products Have Custom Overrides
      </h3>
      <p className="text-white/70 mb-6">
        Some products have custom mappings for this field. How would you like to apply this change?
      </p>
      <div className="flex flex-col gap-3">
        <button
          onClick={() => handlePropagationChoice('apply_all')}
          className="px-4 py-3 bg-red-500/20 border border-red-500/30 rounded-lg text-left"
        >
          <div className="font-medium text-red-400">Apply to all products</div>
          <div className="text-sm text-white/50">
            Clear ALL product-level overrides for this field
          </div>
        </button>
        <button
          onClick={() => handlePropagationChoice('preserve_overrides')}
          className="px-4 py-3 bg-[#5df0c0]/20 border border-[#5df0c0]/30 rounded-lg text-left"
        >
          <div className="font-medium text-[#5df0c0]">Preserve custom overrides</div>
          <div className="text-sm text-white/50">
            Only update products using the shop default
          </div>
        </button>
        <button
          onClick={() => { setShowPropagationModal(false); setPendingChange(null); }}
          className="px-4 py-2 text-white/50 hover:text-white"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
```

### 4.4 Add Link to Product Mapping Page

**File:** `apps/web/src/app/shops/[id]/products/page.tsx` (or product list component)

Add a "Customize Mappings" link/button for each product row that navigates to `/shops/[id]/products/[pid]/mapping`.

---

## Phase 5: Cleanup

### 5.1 Remove AI Enrichment References

**Files to modify:**

1. `packages/shared/src/openai-feed-spec.ts`
   - Remove `isAiEnrichable` from interface
   - Remove from all 70 field definitions
   - Remove `AI_ENRICHABLE_FIELDS` constant
   - Remove from `FIELD_STATS`

2. `packages/shared/src/index.ts`
   - Remove `AI_ENRICHABLE_FIELDS` export

3. Search entire codebase for any remaining references to:
   - `isAiEnrichable`
   - `AI_ENRICHABLE_FIELDS`
   - `aiTitle`, `aiDescription`, `aiSuggestedCategory`
   - Any AI enrichment service/endpoint references

---

## Implementation Order

### Step 1: Database & Shared Package (Foundation)
1. Add `productFieldOverrides` column to Prisma schema
2. Create and run migration
3. Update `openai-feed-spec.ts` (remove AI, add new types)
4. Create `staticValueValidator.ts`
5. Rebuild shared package

### Step 2: Backend API (Core Logic)
1. Update `AutoFillService` to handle product overrides
2. Create `productReprocessService.ts`
3. Add product override endpoints to `productController.ts`
4. Update shop field-mappings endpoint with propagation mode

### Step 3: Frontend - Product Mapping Page
1. Create `ProductFieldMappingRow.tsx` component
2. Create `/shops/[id]/products/[pid]/mapping/page.tsx`
3. Add API client functions for override endpoints

### Step 4: Frontend - Setup Page Updates
1. Add propagation modal to setup page
2. Update handleMappingChange logic

### Step 5: Integration & Navigation
1. Add "Customize Mappings" link to product list
2. Test full flow: shop mapping -> product override -> feed generation

### Step 6: Cleanup
1. Remove AI enrichment references from codebase
2. Run full test suite
3. Manual QA

---

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/shops/:shopId/products/:productId/field-overrides` | Get product overrides |
| PUT | `/api/v1/shops/:shopId/products/:productId/field-overrides` | Update product overrides |
| DELETE | `/api/v1/shops/:shopId/products/:productId/field-overrides/:attribute` | Reset single field |
| PUT | `/api/v1/shops/:shopId/field-mappings` | Updated with `propagationMode` param |

---

## New Files

| File | Purpose |
|------|---------|
| `packages/shared/src/validation/staticValueValidator.ts` | Static value validation |
| `apps/api/src/services/productReprocessService.ts` | Re-process products after override changes |
| `apps/web/src/app/shops/[id]/products/[pid]/mapping/page.tsx` | Product mapping page |
| `apps/web/src/components/setup/ProductFieldMappingRow.tsx` | Product override row component |

---

## Modified Files

| File | Changes |
|------|---------|
| `apps/api/prisma/schema.prisma` | Add `productFieldOverrides` column |
| `packages/shared/src/openai-feed-spec.ts` | Remove AI, add override types |
| `apps/api/src/services/autoFillService.ts` | Support product overrides |
| `apps/api/src/controllers/productController.ts` | Override endpoints |
| `apps/api/src/controllers/shopController.ts` | Propagation mode |
| `apps/web/src/app/shops/[id]/setup/page.tsx` | Propagation modal |
| Product sync worker | Pass overrides to AutoFillService |

---

## Testing Scenarios

1. **Basic Override Flow**
   - Create static value override for `title`
   - Verify `openaiAutoFilled.title` updated
   - Verify feed output uses static value

2. **Custom Mapping Override**
   - Set custom WooCommerce mapping for `material`
   - Verify value extracted from new path

3. **Reset to Shop Default**
   - Create override, then reset
   - Verify reverts to shop mapping

4. **Propagation: Apply All**
   - Product A has override, Product B uses shop default
   - Change shop mapping with "Apply to all"
   - Verify Product A override cleared

5. **Propagation: Preserve Overrides**
   - Same setup as above
   - Change shop mapping with "Preserve overrides"
   - Verify Product A override retained

6. **Locked Field Handling**
   - Try to create custom mapping for `id` → should be blocked
   - Create static value for `title` → should work
   - Try to create static value for `gtin` → should be blocked

7. **Validation**
   - Enter invalid enum value → should show error, block save
   - Enter valid enum value → should save successfully
