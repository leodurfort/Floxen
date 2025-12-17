// Test the extraction logic with actual product data

const productData = {
  "wooAttributes": [
    {"id": 3, "name": "Material", "option": "Plastic"},
    {"id": 4, "name": "Texture", "option": "Lisse"},
    {"id": 0, "name": "Color", "option": "Black"},
    {"id": 0, "name": "Size", "option": "S"}
  ]
};

// This is the frontend extraction logic
function extractFieldValue(wooRawJson, fieldPath) {
  if (!wooRawJson || !fieldPath) return null;

  // Handle attributes special case
  if (fieldPath.startsWith('attributes.')) {
    const attrName = fieldPath.replace('attributes.', '');
    const attributes = wooRawJson.wooAttributes || [];

    console.log('[extractFieldValue] Attributes extraction:', {
      attrName,
      hasAttributes: !!attributes.length,
      availableAttributes: attributes.map((a) => a.name),
    });

    // Find attribute by name (case-insensitive)
    const attr = attributes.find((a) =>
      a.name && a.name.toLowerCase() === attrName.toLowerCase()
    );

    if (!attr) {
      console.log('[extractFieldValue] Attribute not found:', attrName);
      return null;
    }

    // For variations: check "option" (singular string)
    if (attr.option !== undefined && attr.option !== null) {
      console.log('[extractFieldValue] Variation attribute found:', {
        attrName,
        option: attr.option,
      });
      return attr.option;
    }

    // For parent products: check "options" (array)
    if (Array.isArray(attr.options) && attr.options.length > 0) {
      const result = attr.options.length === 1
        ? attr.options[0]
        : attr.options.join(', ');

      console.log('[extractFieldValue] Parent attribute found:', {
        attrName,
        options: attr.options,
        result,
      });

      return result;
    }

    console.log('[extractFieldValue] Attribute has no value:', { attr });
    return null;
  }

  return null;
}

// Test Material
console.log('='.repeat(80));
console.log('Testing Material Attribute Extraction');
console.log('='.repeat(80));
console.log('Product data:', JSON.stringify(productData, null, 2));
console.log('');

const materialValue = extractFieldValue(productData, 'attributes.Material');

console.log('');
console.log('='.repeat(80));
console.log('RESULT:', materialValue === null ? 'NULL ❌' : `"${materialValue}" ✅`);
console.log('='.repeat(80));

// Test Color
console.log('');
console.log('Testing Color:');
const colorValue = extractFieldValue(productData, 'attributes.Color');
console.log('Color result:', colorValue);

// Test Size
console.log('');
console.log('Testing Size:');
const sizeValue = extractFieldValue(productData, 'attributes.Size');
console.log('Size result:', sizeValue);
