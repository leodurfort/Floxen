-- Remove unused INCREMENTAL and SINGLE_PRODUCT values from SyncType enum
-- PostgreSQL doesn't support removing enum values directly, so we need to:
-- 1. Create a new enum type
-- 2. Update the column to use the new type
-- 3. Drop the old enum
-- 4. Rename the new enum

-- Create new enum type without the unused values
CREATE TYPE "SyncType_new" AS ENUM ('FULL', 'MANUAL');

-- Update the column to use the new enum type
ALTER TABLE "SyncBatch" ALTER COLUMN "sync_type" TYPE "SyncType_new" USING ("sync_type"::text::"SyncType_new");

-- Drop the old enum type
DROP TYPE "SyncType";

-- Rename the new enum type to the original name
ALTER TYPE "SyncType_new" RENAME TO "SyncType";
