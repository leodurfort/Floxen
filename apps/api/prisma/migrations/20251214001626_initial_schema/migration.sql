-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'SYNCED', 'EXCLUDED', 'ERROR');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'SYNCING', 'COMPLETED', 'FAILED', 'PAUSED');

-- CreateEnum
CREATE TYPE "SyncType" AS ENUM ('FULL', 'INCREMENTAL', 'SINGLE_PRODUCT', 'MANUAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "subscription_tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "timezone" TEXT,
    "locale" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "woo_store_url" TEXT NOT NULL,
    "woo_consumer_key" TEXT,
    "woo_consumer_secret" TEXT,
    "shop_name" TEXT NOT NULL,
    "shop_currency" TEXT NOT NULL DEFAULT 'USD',
    "is_connected" BOOLEAN NOT NULL DEFAULT false,
    "last_sync_at" TIMESTAMP(3),
    "sync_status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "sync_enabled" BOOLEAN NOT NULL DEFAULT true,
    "openai_merchant_id" TEXT,
    "openai_endpoint" TEXT,
    "openai_token" TEXT,
    "openai_enabled" BOOLEAN NOT NULL DEFAULT false,
    "seller_name" TEXT,
    "seller_url" TEXT,
    "seller_privacy_policy" TEXT,
    "seller_tos" TEXT,
    "return_policy" TEXT,
    "return_window" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "woo_product_id" INTEGER NOT NULL,
    "woo_title" TEXT NOT NULL,
    "woo_description" TEXT,
    "woo_sku" TEXT,
    "woo_price" DECIMAL(65,30),
    "woo_sale_price" DECIMAL(65,30),
    "woo_stock_status" TEXT,
    "woo_stock_quantity" INTEGER,
    "woo_categories" JSONB,
    "woo_images" JSONB,
    "woo_attributes" JSONB,
    "woo_permalink" TEXT,
    "woo_raw_json" JSONB,
    "feed_id" TEXT,
    "feed_title" TEXT,
    "feed_description" TEXT,
    "feed_price" TEXT,
    "feed_availability" TEXT,
    "feed_category" TEXT,
    "feed_brand" TEXT,
    "feed_image_link" TEXT,
    "feed_enable_search" BOOLEAN NOT NULL DEFAULT true,
    "feed_enable_checkout" BOOLEAN NOT NULL DEFAULT false,
    "feed_data_json" JSONB,
    "ai_enriched" BOOLEAN NOT NULL DEFAULT false,
    "ai_title" TEXT,
    "ai_description" TEXT,
    "ai_keywords" TEXT[],
    "ai_q_and_a" JSONB,
    "ai_suggested_category" TEXT,
    "ai_enriched_at" TIMESTAMP(3),
    "manual_override" BOOLEAN NOT NULL DEFAULT false,
    "manual_title" TEXT,
    "manual_description" TEXT,
    "manual_category" TEXT,
    "manual_keywords" TEXT[],
    "manual_q_and_a" JSONB,
    "manual_edited_at" TIMESTAMP(3),
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "sync_status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "last_synced_at" TIMESTAMP(3),
    "sync_error" TEXT,
    "checksum" TEXT,
    "is_valid" BOOLEAN NOT NULL DEFAULT false,
    "validation_errors" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sku" TEXT,
    "price" DECIMAL(65,30),
    "attributes" JSONB,
    "availability" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAnalytics" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "chatgpt_impressions" INTEGER NOT NULL DEFAULT 0,
    "chatgpt_clicks" INTEGER NOT NULL DEFAULT 0,
    "chatgpt_conversions" INTEGER NOT NULL DEFAULT 0,
    "chatgpt_revenue" DECIMAL(10,2),

    CONSTRAINT "ProductAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopAnalytics" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "total_products" INTEGER NOT NULL DEFAULT 0,
    "synced_products" INTEGER NOT NULL DEFAULT 0,
    "enriched_products" INTEGER NOT NULL DEFAULT 0,
    "chatgpt_impressions" INTEGER NOT NULL DEFAULT 0,
    "chatgpt_clicks" INTEGER NOT NULL DEFAULT 0,
    "chatgpt_conversions" INTEGER NOT NULL DEFAULT 0,
    "chatgpt_traffic" INTEGER NOT NULL DEFAULT 0,
    "chatgpt_revenue" DECIMAL(10,2),

    CONSTRAINT "ShopAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncBatch" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "sync_type" "SyncType" NOT NULL,
    "total_products" INTEGER NOT NULL DEFAULT 0,
    "synced_products" INTEGER NOT NULL DEFAULT 0,
    "failed_products" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "errorLog" JSONB,
    "feed_file_url" TEXT,
    "triggered_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_user_id_key" ON "UserSettings"("user_id");

-- CreateIndex
CREATE INDEX "Shop_user_id_idx" ON "Shop"("user_id");

-- CreateIndex
CREATE INDEX "Product_shop_id_idx" ON "Product"("shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "Product_shop_id_woo_product_id_key" ON "Product"("shop_id", "woo_product_id");

-- CreateIndex
CREATE INDEX "ProductVariant_product_id_idx" ON "ProductVariant"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAnalytics_product_id_date_key" ON "ProductAnalytics"("product_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ShopAnalytics_shop_id_date_key" ON "ShopAnalytics"("shop_id", "date");

-- CreateIndex
CREATE INDEX "SyncBatch_shop_id_idx" ON "SyncBatch"("shop_id");

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAnalytics" ADD CONSTRAINT "ProductAnalytics_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopAnalytics" ADD CONSTRAINT "ShopAnalytics_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncBatch" ADD CONSTRAINT "SyncBatch_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
