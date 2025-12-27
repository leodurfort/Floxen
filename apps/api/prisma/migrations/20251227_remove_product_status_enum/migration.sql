-- DropIndex
DROP INDEX IF EXISTS "Product_shop_id_status_idx";

-- AlterTable - Remove status column from Product
ALTER TABLE "Product" DROP COLUMN IF EXISTS "status";

-- DropEnum
DROP TYPE IF EXISTS "ProductStatus";
