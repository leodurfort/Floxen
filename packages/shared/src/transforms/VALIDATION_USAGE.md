# Validation Layer Usage Guide

The validation layer provides comprehensive validation for OpenAI Product Feed entries. This guide shows how to integrate it into your application.

## Basic Usage

### 1. Validate a Single Entry

```typescript
import { validateFeedEntry } from '@floxen/shared';

const entry = {
  enable_search: 'true',
  enable_checkout: 'false',
  id: 'SHOP123-456',
  title: 'Premium Wireless Headphones',
  description: 'High-quality wireless headphones',
  // ... other fields
};

const result = validateFeedEntry(entry);

if (!result.valid) {
  console.error('Validation failed:', result.errors);
  result.errors.forEach(error => {
    console.error(`  ${error.field}: ${error.error}`);
  });
}
```

### 2. Validation Options

```typescript
import { validateFeedEntry } from '@floxen/shared';

const result = validateFeedEntry(entry, {
  // Skip validation for specific fields
  skipFields: ['video_link', 'model_3d_link'],

  // Treat warnings as errors
  strictMode: true,

  // Validate optional fields too
  validateOptional: true,
});
```

## Integration Examples

### Example 1: Feed Builder Service

```typescript
// apps/api/src/services/woocommerce/feedBuilder.ts
import { validateFeedEntry } from '@floxen/shared';
import { logger } from '../../lib/logger';

export class FeedBuilder {
  async buildFeed(products: Product[], shop: Shop): Promise<FeedEntry[]> {
    const feed: FeedEntry[] = [];
    const errors: Array<{ productId: string; errors: any[] }> = [];

    for (const product of products) {
      // Build entry using AutoFillService
      const entry = await this.autoFillService.fill(product);

      // Validate entry before adding to feed
      const validation = validateFeedEntry(entry, {
        validateOptional: false, // Only validate required fields
      });

      if (!validation.valid) {
        logger.error('[FeedBuilder] Invalid product', {
          productId: product.id,
          shopId: shop.id,
          errors: validation.errors,
        });

        errors.push({
          productId: product.id,
          errors: validation.errors,
        });

        // Skip invalid products
        continue;
      }

      // Log warnings but don't skip
      if (validation.warnings.length > 0) {
        logger.warn('[FeedBuilder] Product has warnings', {
          productId: product.id,
          warnings: validation.warnings,
        });
      }

      feed.push(entry);
    }

    // Log summary
    logger.info('[FeedBuilder] Feed build complete', {
      total: products.length,
      valid: feed.length,
      invalid: errors.length,
    });

    return feed;
  }
}
```

### Example 2: API Endpoint for Validation

```typescript
// apps/api/src/routes/validation.ts
import { Router } from 'express';
import { validateFeedEntry } from '@floxen/shared';

const router = Router();

/**
 * POST /api/v1/validation/entry
 * Validate a single feed entry
 */
router.post('/entry', async (req, res) => {
  try {
    const entry = req.body;
    const result = validateFeedEntry(entry);

    res.json({
      valid: result.valid,
      errors: result.errors,
      warnings: result.warnings,
    });
  } catch (error) {
    res.status(500).json({ error: 'Validation failed' });
  }
});

export default router;
```

### Example 3: Client-Side Preview Validation

```typescript
// apps/web/src/components/ProductPreview.tsx
import { validateFeedEntry } from '@floxen/shared';

export function ProductPreview({ entry }: { entry: any }) {
  const validation = validateFeedEntry(entry, {
    skipFields: [], // Validate everything
  });

  return (
    <div>
      <h2>Product Preview</h2>

      {/* Show validation status */}
      {validation.valid ? (
        <Badge color="green">✓ Valid</Badge>
      ) : (
        <Badge color="red">✗ {validation.errors.length} errors</Badge>
      )}

      {/* Show errors */}
      {validation.errors.length > 0 && (
        <Alert severity="error">
          <AlertTitle>Validation Errors</AlertTitle>
          <ul>
            {validation.errors.map((error, i) => (
              <li key={i}>
                <strong>{error.field}:</strong> {error.error}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Show warnings */}
      {validation.warnings.length > 0 && (
        <Alert severity="warning">
          <AlertTitle>Warnings</AlertTitle>
          <ul>
            {validation.warnings.map((warning, i) => (
              <li key={i}>
                <strong>{warning.field}:</strong> {warning.error}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Show preview */}
      <ProductFields entry={entry} />
    </div>
  );
}
```

## Best Practices

### 1. When to Validate

- **Before feed generation**: Catch errors before sending to OpenAI
- **During product import**: Validate as products are synced
- **In development**: Validate during testing

### 2. Error Handling

```typescript
// Good: Specific error handling
const result = validateFeedEntry(entry);
if (!result.valid) {
  result.errors.forEach(error => {
    if (error.field === 'price') {
      // Fix price format issue
      entry.price = fixPriceFormat(entry.price);
    } else if (error.field === 'gtin') {
      // Clean GTIN
      entry.gtin = cleanGtin(entry.gtin);
    }
  });

  // Re-validate after fixes
  const revalidation = validateFeedEntry(entry);
  if (!revalidation.valid) {
    logger.error('Could not fix validation errors', revalidation.errors);
    throw new Error('Validation failed');
  }
}
```

### 3. Logging

```typescript
// Good: Structured logging for debugging
if (!result.valid) {
  logger.error('[Validation] Entry failed validation', {
    productId: product.id,
    shopId: shop.id,
    errorCount: result.errors.length,
    errors: result.errors.map(e => ({
      field: e.field,
      error: e.error,
      severity: e.severity,
    })),
    // Include actual values for debugging
    values: result.errors.reduce((acc, e) => {
      acc[e.field] = entry[e.field];
      return acc;
    }, {} as Record<string, any>),
  });
}
```

## Conclusion

The validation layer provides:
- Early error detection
- Detailed error messages
- Field-specific validation
- Flexible validation options
