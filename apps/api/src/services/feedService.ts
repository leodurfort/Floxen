import { Product, Shop } from '@prisma/client';

export function generateFeedPayload(shop: Shop, products: Product[]) {
  return {
    seller: {
      id: shop.id,
      name: shop.shopName,
      url: shop.sellerUrl || shop.wooStoreUrl,
    },
    generatedAt: new Date().toISOString(),
    items: products.map((p) => ({
      id: `${shop.id}-${p.wooProductId}`,
      title: p.feedTitle || p.aiTitle || p.manualTitle || p.wooTitle,
      description: p.feedDescription || p.aiDescription || p.manualDescription || p.wooDescription,
      price: p.feedPrice || (p.wooPrice ? `${p.wooPrice} ${shop.shopCurrency}` : null),
      availability: p.feedAvailability || p.wooStockStatus || 'in_stock',
      image_link: p.feedImageLink || (Array.isArray(p.wooImages) ? (p.wooImages as any[])[0]?.src : undefined),
      category: p.feedCategory || p.aiSuggestedCategory || p.manualCategory,
      brand: p.feedBrand,
      enable_search: p.feedEnableSearch,
      enable_checkout: p.feedEnableCheckout,
      ai_keywords: p.aiKeywords,
      ai_q_and_a: p.aiQAndA,
    })),
  };
}
