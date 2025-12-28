-- Ensure one WooCommerce store can only be linked to one account
-- CreateIndex
CREATE UNIQUE INDEX "Shop_woo_store_url_key" ON "Shop"("woo_store_url");
