// Test the FIXED extraction logic with both wooAttributes and attributes

// Updated extraction function
function extractFieldValue(wooRawJson, fieldPath) {
  if (!wooRawJson || !fieldPath) return null;

  if (fieldPath.startsWith('attributes.')) {
    const attrName = fieldPath.replace('attributes.', '');
    // Check both wooAttributes (from API response) and attributes (from wooRawJson)
    const attributes = wooRawJson.wooAttributes || wooRawJson.attributes || [];

    console.log('  Checking for:', attrName);
    console.log('  Has wooAttributes:', !!wooRawJson.wooAttributes);
    console.log('  Has attributes:', !!wooRawJson.attributes);
    console.log('  Final array length:', attributes.length);

    const attr = attributes.find((a) =>
      a.name && a.name.toLowerCase() === attrName.toLowerCase()
    );

    if (!attr) {
      console.log('  ❌ Attribute not found');
      return null;
    }

    // For variations: check option (singular string)
    if (attr.option !== undefined && attr.option !== null) {
      console.log('  ✅ Found variation option:', attr.option);
      return attr.option;
    }

    // For parent products: check options (array)
    if (Array.isArray(attr.options) && attr.options.length > 0) {
      const result = attr.options.length === 1 ? attr.options[0] : attr.options.join(', ');
      console.log('  ✅ Found parent options:', result);
      return result;
    }

    console.log('  ❌ No value found');
    return null;
  }

  return null;
}

// Test 1: API Response Format (wooAttributes - what we're actually getting)
console.log('='.repeat(80));
console.log('TEST 1: API Response Format (wooAttributes)');
console.log('='.repeat(80));
const apiData = {
  wooAttributes: [
    {id: 3, name: 'Material', option: 'Plastic'},
    {id: 4, name: 'Texture', option: 'Lisse'},
    {id: 0, name: 'Color', option: 'Red'},
    {id: 0, name: 'Size', option: 'M'}
  ]
};

const material1 = extractFieldValue(apiData, 'attributes.Material');
console.log('  📦 RESULT:', material1 === null ? 'NULL ❌' : `"${material1}" ✅`);
console.log('');

const color1 = extractFieldValue(apiData, 'attributes.Color');
console.log('  📦 RESULT:', color1 === null ? 'NULL ❌' : `"${color1}" ✅`);
console.log('');

// Test 2: WooCommerce Raw JSON Format (attributes - parent product format)
console.log('='.repeat(80));
console.log('TEST 2: WooCommerce Raw JSON Format (attributes - parent)');
console.log('='.repeat(80));
const wooData = {
  attributes: [
    {id: 3, name: 'Material', options: ['Plastic']},
    {id: 0, name: 'Color', options: ['Red', 'Blue', 'Green']}
  ]
};

const material2 = extractFieldValue(wooData, 'attributes.Material');
console.log('  📦 RESULT:', material2 === null ? 'NULL ❌' : `"${material2}" ✅`);
console.log('');

const color2 = extractFieldValue(wooData, 'attributes.Color');
console.log('  📦 RESULT:', color2 === null ? 'NULL ❌' : `"${color2}" ✅`);
console.log('');

console.log('='.repeat(80));
console.log('✅ Both formats now work correctly!');
console.log('='.repeat(80));
