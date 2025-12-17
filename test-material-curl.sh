#!/bin/bash

# Test Material attribute for product ID 64
# Usage: ./test-material-curl.sh YOUR_ACCESS_TOKEN

SHOP_ID="cmja4s0x50001jw2lyqbqoj2g"
PRODUCT_ID=64
API_URL="https://api-production-6a74.up.railway.app"

if [ -z "$1" ]; then
  echo "❌ Missing access token"
  echo ""
  echo "To find your access token:"
  echo "1. Open browser DevTools (F12)"
  echo "2. Go to Application tab"
  echo "3. Look under Storage > Local Storage > http://localhost:3000 (or your domain)"
  echo "4. Find the 'accessToken' key"
  echo ""
  echo "Usage: ./test-material-curl.sh YOUR_ACCESS_TOKEN"
  exit 1
fi

ACCESS_TOKEN="$1"

echo "================================================================================"
echo "Testing Material Attribute - Product ID $PRODUCT_ID"
echo "================================================================================"
echo "API URL: $API_URL"
echo "Shop ID: $SHOP_ID"
echo ""

# Fetch the product
response=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  "$API_URL/api/v1/shops/$SHOP_ID/products/$PRODUCT_ID")

# Split response and status code
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" != "200" ]; then
  echo "❌ HTTP Error: $http_code"
  echo "$body"
  exit 1
fi

echo "✅ Product fetched successfully"
echo ""

# Parse and display using jq (if available) or grep
if command -v jq &> /dev/null; then
  echo "Product Info:"
  echo "  ID: $(echo "$body" | jq -r '.product.id')"
  echo "  Name: $(echo "$body" | jq -r '.product.name')"
  echo "  Type: $(echo "$body" | jq -r '.product.type')"
  echo "  Parent ID: $(echo "$body" | jq -r '.product.parent_id // "N/A"')"
  echo ""

  echo "Attributes:"
  echo "--------------------------------------------------------------------------------"
  echo "$body" | jq -r '.product.attributes[] | "  [\(.name)]"'
  echo "$body" | jq -r '.product.attributes[] | "    option: \(.option // "null")"'
  echo "$body" | jq -r '.product.attributes[] | "    options: \(.options // "null")"'
  echo ""

  echo "Material Attribute:"
  echo "--------------------------------------------------------------------------------"
  material=$(echo "$body" | jq '.product.attributes[] | select(.name == "Material" or .name == "material")')

  if [ -z "$material" ]; then
    echo "  ❌ Material attribute NOT FOUND"
    echo ""
    echo "  Available attributes:"
    echo "$body" | jq -r '.product.attributes[].name'
  else
    echo "  ✅ FOUND:"
    echo "$material" | jq '.'

    echo ""
    echo "  Extraction:"
    option=$(echo "$material" | jq -r '.option // empty')
    options=$(echo "$material" | jq -r '.options[]? // empty')

    if [ -n "$option" ]; then
      echo "    📦 Value (variation format): \"$option\""
    elif [ -n "$options" ]; then
      echo "    📦 Value (parent format): \"$options\""
    else
      echo "    ❌ No value found"
    fi
  fi

  echo ""
  echo "================================================================================"
  echo "Full Attributes JSON:"
  echo "================================================================================"
  echo "$body" | jq '.product.attributes'

else
  echo "⚠️  jq not installed - showing raw JSON"
  echo "$body"
  echo ""
  echo "Install jq for better formatting: brew install jq"
fi
