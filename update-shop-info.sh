#!/bin/bash

# Quick script to update shop information via API
# Usage: ./update-shop-info.sh <shop-id> <access-token>

SHOP_ID="$1"
ACCESS_TOKEN="$2"
API_URL="${API_URL:-http://localhost:8080}"

if [ -z "$SHOP_ID" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "Usage: ./update-shop-info.sh <shop-id> <access-token>"
  echo ""
  echo "Example:"
  echo "  ./update-shop-info.sh cm12345 eyJhbGc..."
  exit 1
fi

echo "Updating shop information for shop: $SHOP_ID"
echo "API URL: $API_URL"
echo ""

curl -X PATCH "$API_URL/api/v1/shops/$SHOP_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sellerName": "Example Store",
    "sellerUrl": "https://example.com",
    "sellerPrivacyPolicy": "https://example.com/privacy",
    "sellerTos": "https://example.com/terms",
    "returnPolicy": "30-day money back guarantee",
    "returnWindow": 30
  }'

echo ""
echo ""
echo "Done! Now refresh your Field Mapping Setup page to see the values."
