-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "openai_auto_filled" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "openai_edited" JSONB NOT NULL DEFAULT '{}';

-- CreateIndex
CREATE INDEX "Product_shop_id_status_idx" ON "Product"("shop_id", "status");
