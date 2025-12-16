-- DropIndex
DROP INDEX "woocommerce_fields_value_key";

-- AlterTable
ALTER TABLE "Shop" ALTER COLUMN "shop_name" DROP NOT NULL,
ALTER COLUMN "shop_currency" DROP NOT NULL,
ALTER COLUMN "shop_currency" DROP DEFAULT;
