-- Add new columns to woocommerce_fields table for dynamic discovery
ALTER TABLE "woocommerce_fields" ADD COLUMN IF NOT EXISTS "is_standard" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "woocommerce_fields" ADD COLUMN IF NOT EXISTS "shop_id" TEXT;

-- Drop the old unique constraint on value (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'woocommerce_fields_value_key') THEN
        ALTER TABLE "woocommerce_fields" DROP CONSTRAINT "woocommerce_fields_value_key";
    END IF;
END $$;

-- Add new unique constraint on (value, shop_id) to allow same field for different shops
DROP INDEX IF EXISTS "woocommerce_fields_value_shop_id_key";
CREATE UNIQUE INDEX "woocommerce_fields_value_shop_id_key" ON "woocommerce_fields"("value", "shop_id");

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "woocommerce_fields_shop_id_idx" ON "woocommerce_fields"("shop_id");
CREATE INDEX IF NOT EXISTS "woocommerce_fields_is_standard_idx" ON "woocommerce_fields"("is_standard");

-- Add foreign key to Shop
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'woocommerce_fields_shop_id_fkey') THEN
        ALTER TABLE "woocommerce_fields" ADD CONSTRAINT "woocommerce_fields_shop_id_fkey"
        FOREIGN KEY ("shop_id") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
