-- DropForeignKey
ALTER TABLE "woocommerce_fields" DROP CONSTRAINT "woocommerce_fields_shop_id_fkey";

-- DropIndex
DROP INDEX "woocommerce_fields_shop_id_idx";

-- DropIndex
DROP INDEX "woocommerce_fields_is_standard_idx";

-- DropIndex
DROP INDEX "woocommerce_fields_value_shop_id_key";

-- AlterTable
ALTER TABLE "woocommerce_fields" DROP COLUMN "is_standard",
DROP COLUMN "shop_id";

-- CreateIndex
CREATE UNIQUE INDEX "woocommerce_fields_value_key" ON "woocommerce_fields"("value" ASC);

