-- AlterEnum
BEGIN;
CREATE TYPE "SubscriptionTier_new" AS ENUM ('FREE', 'STARTER', 'PROFESSIONAL');
ALTER TABLE "User" ALTER COLUMN "subscription_tier" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "subscription_tier" TYPE "SubscriptionTier_new" USING ("subscription_tier"::text::"SubscriptionTier_new");
ALTER TYPE "SubscriptionTier" RENAME TO "SubscriptionTier_old";
ALTER TYPE "SubscriptionTier_new" RENAME TO "SubscriptionTier";
DROP TYPE "SubscriptionTier_old";
ALTER TABLE "User" ALTER COLUMN "subscription_tier" SET DEFAULT 'FREE';
COMMIT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "is_selected" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sync_state" TEXT NOT NULL DEFAULT 'synced';

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "needs_product_reselection" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "product_limit" INTEGER NOT NULL DEFAULT 15;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "current_period_end" TIMESTAMP(3),
ADD COLUMN     "stripe_customer_id" TEXT,
ADD COLUMN     "subscription_id" TEXT,
ADD COLUMN     "subscription_status" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_stripe_customer_id_key" ON "User"("stripe_customer_id");
