-- Remove product-level sync_status column (dead code - was never properly used)
-- Shop-level sync_status remains unchanged

ALTER TABLE "Product" DROP COLUMN IF EXISTS "sync_status";
