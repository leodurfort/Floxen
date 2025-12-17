/**
 * Shop-Level Fields Configuration
 *
 * These are NOT WooCommerce product fields, but shop-level settings
 * that can be mapped to OpenAI feed attributes like seller_name, return_policy, etc.
 *
 * These fields are stored in the Shop model and apply to all products in the shop.
 */

export interface ShopField {
  value: string;           // Field path (e.g., "shop.sellerName")
  label: string;           // Display name
  category: string;        // Always "Shop Settings"
  description?: string;    // Field description
}

export const SHOP_FIELDS: ShopField[] = [
  // Merchant Info
  {
    value: 'shop.sellerName',
    label: 'Shop: Seller Name',
    category: 'Shop Settings',
    description: 'Shop/merchant name from shop settings'
  },
  {
    value: 'shop.sellerUrl',
    label: 'Shop: Seller URL',
    category: 'Shop Settings',
    description: 'Shop website URL'
  },
  {
    value: 'shop.sellerPrivacyPolicy',
    label: 'Shop: Privacy Policy URL',
    category: 'Shop Settings',
    description: 'Privacy policy page URL'
  },
  {
    value: 'shop.sellerTos',
    label: 'Shop: Terms of Service URL',
    category: 'Shop Settings',
    description: 'Terms of service page URL'
  },

  // Returns
  {
    value: 'shop.returnPolicy',
    label: 'Shop: Return Policy',
    category: 'Shop Settings',
    description: 'Return policy description'
  },
  {
    value: 'shop.returnWindow',
    label: 'Shop: Return Window (days)',
    category: 'Shop Settings',
    description: 'Number of days for returns'
  },

  // Currency
  {
    value: 'shop.shopCurrency',
    label: 'Shop: Currency',
    category: 'Shop Settings',
    description: 'Shop currency code (e.g., USD, EUR)'
  },
];
