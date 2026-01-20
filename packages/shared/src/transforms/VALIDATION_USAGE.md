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

### 2. Validate Multiple Entries

```typescript
import { validateFeedEntries, getValidationSummary } from '@floxen/shared';

const entries = [entry1, entry2, entry3];
const results = validateFeedEntries(entries);

// Get summary statistics
const summary = getValidationSummary(results);
console.log(`Validated ${entries.length} entries`);
console.log(`Invalid: ${summary.invalid}`);
console.log(`Total errors: ${summary.totalErrors}`);
console.log(`Total warnings: ${summary.totalWarnings}`);

// Most common errors
summary.commonErrors.forEach(({ error, count }) => {
  console.log(`  ${count}x: ${error}`);
});
```

### 3. Validation Options

```typescript
import { validateFeedEntry, ValidationOptions } from '@floxen/shared';

const options: ValidationOptions = {
  // Skip validation for specific fields
  skipFields: ['video_link', 'model_3d_link'],

  // Treat warnings as errors
  strictMode: true,

  // Validate optional fields too
  validateOptional: true,
};

const result = validateFeedEntry(entry, options);
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

/**
 * POST /api/v1/validation/batch
 * Validate multiple feed entries
 */
router.post('/batch', async (req, res) => {
  try {
    const entries = req.body.entries;
    const results = validateFeedEntries(entries);
    const summary = getValidationSummary(results);

    res.json({
      summary,
      results: Array.from(results.entries()).map(([index, result]) => ({
        index,
        valid: result.valid,
        errors: result.errors,
        warnings: result.warnings,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Batch validation failed' });
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

### Example 4: Pre-Deployment Validation Script

```typescript
// scripts/validate-feed.ts
import { PrismaClient } from '@prisma/client';
import { validateFeedEntries, getValidationSummary } from '@floxen/shared';
import { FeedBuilder } from '../apps/api/src/services/woocommerce/feedBuilder';

async function validateFeed(shopId: string) {
  const prisma = new PrismaClient();

  try {
    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new Error('Shop not found');

    const products = await prisma.product.findMany({
      where: { shopId, status: 'APPROVED' },
    });

    console.log(`Validating feed for shop: ${shop.shopName}`);
    console.log(`Products to validate: ${products.length}`);

    const feedBuilder = new FeedBuilder(shop);
    const feed = await feedBuilder.buildFeed(products, shop);

    // Validate entire feed
    const results = validateFeedEntries(feed);
    const summary = getValidationSummary(results);

    // Print summary
    console.log('\n=== Validation Summary ===');
    console.log(`Total entries: ${feed.length}`);
    console.log(`Invalid entries: ${summary.invalid}`);
    console.log(`Total errors: ${summary.totalErrors}`);
    console.log(`Total warnings: ${summary.totalWarnings}`);

    // Show most common errors
    if (summary.commonErrors.length > 0) {
      console.log('\n=== Most Common Errors ===');
      summary.commonErrors.slice(0, 5).forEach(({ error, count }) => {
        console.log(`  ${count}x: ${error}`);
      });
    }

    // Show detailed errors for first few invalid entries
    if (summary.invalid > 0) {
      console.log('\n=== Sample Invalid Entries ===');
      let count = 0;
      for (const [index, result] of results.entries()) {
        if (count >= 3) break;
        console.log(`\nEntry ${index}:`);
        result.errors.forEach(error => {
          console.log(`  ⚠️  ${error.field}: ${error.error}`);
        });
        count++;
      }
    }

    // Exit with error code if validation failed
    process.exit(summary.invalid > 0 ? 1 : 0);
  } finally {
    await prisma.$disconnect();
  }
}

// Run validation
const shopId = process.argv[2];
if (!shopId) {
  console.error('Usage: ts-node validate-feed.ts <shopId>');
  process.exit(1);
}

validateFeed(shopId);
```

## Best Practices

### 1. When to Validate

- ✅ **Before feed generation**: Catch errors before sending to OpenAI
- ✅ **During product import**: Validate as products are synced
- ✅ **In development**: Validate during testing
- ✅ **In CI/CD**: Add validation to deployment pipeline
- ❌ **Not on every API request**: Too expensive, cache results

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

### 3. Performance Considerations

```typescript
// For large feeds, validate in batches
const BATCH_SIZE = 100;
const allEntries = [...]; // Large array

for (let i = 0; i < allEntries.length; i += BATCH_SIZE) {
  const batch = allEntries.slice(i, i + BATCH_SIZE);
  const results = validateFeedEntries(batch);

  // Process results
  for (const [index, result] of results.entries()) {
    if (!result.valid) {
      // Handle invalid entry
    }
  }
}
```

### 4. Logging

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

## Custom Validators

You can also use individual validators for specific needs:

```typescript
import {
  validatePrice,
  validateGtin,
  validateUrl
} from '@floxen/shared';

// Validate price before saving
const priceValidation = validatePrice(product.price);
if (!priceValidation.valid) {
  throw new Error(priceValidation.error);
}

// Validate GTIN on input
const gtinValidation = validateGtin(input.gtin);
if (!gtinValidation.valid) {
  return res.status(400).json({ error: gtinValidation.error });
}
```

## Conclusion

The validation layer provides:
- ✅ Early error detection
- ✅ Detailed error messages
- ✅ Field-specific validation
- ✅ Batch validation support
- ✅ Flexible validation options
- ✅ Performance-friendly

Integrate it into your feed generation pipeline to ensure high-quality data before sending to OpenAI!
