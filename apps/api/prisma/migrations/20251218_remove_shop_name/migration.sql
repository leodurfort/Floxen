-- AlterTable: Remove shopName column (merged into sellerName)
ALTER TABLE "Shop" DROP COLUMN IF EXISTS "shop_name";
