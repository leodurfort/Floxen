/**
 * WooCommerce API response types
 */

export interface WooCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description: string;
  display: string;
  image: WooImage | null;
  menu_order: number;
  count: number;
}

export interface WooImage {
  id: number;
  date_created: string;
  date_modified: string;
  src: string;
  name: string;
  alt: string;
}

export interface WooProductAttribute {
  id: number;
  name: string;
  position: number;
  visible: boolean;
  variation: boolean;
  options: string[];
}

export interface WooProductDimensions {
  length: string;
  width: string;
  height: string;
}

export interface WooMetaData {
  id?: number;
  key: string;
  value: string;
}

export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  type: 'simple' | 'grouped' | 'external' | 'variable';
  status: 'draft' | 'pending' | 'private' | 'publish';
  featured: boolean;
  catalog_visibility: 'visible' | 'catalog' | 'search' | 'hidden';
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  date_on_sale_from: string | null;
  date_on_sale_to: string | null;
  price_html: string;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  downloads: unknown[];
  download_limit: number;
  download_expiry: number;
  external_url: string;
  button_text: string;
  tax_status: 'taxable' | 'shipping' | 'none';
  tax_class: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: 'instock' | 'outofstock' | 'onbackorder';
  backorders: 'no' | 'notify' | 'yes';
  backorders_allowed: boolean;
  backordered: boolean;
  sold_individually: boolean;
  weight: string;
  dimensions: WooProductDimensions;
  shipping_required: boolean;
  shipping_taxable: boolean;
  shipping_class: string;
  shipping_class_id: number;
  reviews_allowed: boolean;
  average_rating: string;
  rating_count: number;
  related_ids: number[];
  upsell_ids: number[];
  cross_sell_ids: number[];
  parent_id: number;
  purchase_note: string;
  categories: Pick<WooCategory, 'id' | 'name' | 'slug'>[];
  tags: { id: number; name: string; slug: string }[];
  images: WooImage[];
  attributes: WooProductAttribute[];
  default_attributes: { id: number; name: string; option: string }[];
  variations: number[];
  grouped_products: number[];
  menu_order: number;
  meta_data: WooMetaData[];
}

export interface WooVariation {
  id: number;
  date_created: string;
  date_modified: string;
  description: string;
  permalink: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  date_on_sale_from: string | null;
  date_on_sale_to: string | null;
  on_sale: boolean;
  status: 'draft' | 'pending' | 'private' | 'publish';
  purchasable: boolean;
  virtual: boolean;
  downloadable: boolean;
  downloads: unknown[];
  download_limit: number;
  download_expiry: number;
  tax_status: 'taxable' | 'shipping' | 'none';
  tax_class: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: 'instock' | 'outofstock' | 'onbackorder';
  backorders: 'no' | 'notify' | 'yes';
  backorders_allowed: boolean;
  backordered: boolean;
  weight: string;
  dimensions: WooProductDimensions;
  shipping_class: string;
  shipping_class_id: number;
  image: WooImage | null;
  attributes: { id: number; name: string; option: string }[];
  menu_order: number;
  meta_data: WooMetaData[];
}

export interface WooStoreSettings {
  id: string;
  label: string;
  description: string;
  type: string;
  default: string;
  value: string;
}

export interface WooBatchRequest<T> {
  create?: T[];
  update?: T[];
  delete?: number[];
}

export interface WooBatchResponse<T> {
  create?: T[];
  update?: T[];
  delete?: T[];
}
