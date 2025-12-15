-- CreateTable
CREATE TABLE "feed_snapshots" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "feed_data" JSONB NOT NULL,
    "product_count" INTEGER NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feed_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feed_snapshots_shop_id_key" ON "feed_snapshots"("shop_id");

-- CreateIndex
CREATE INDEX "feed_snapshots_shop_id_idx" ON "feed_snapshots"("shop_id");

-- AddForeignKey
ALTER TABLE "feed_snapshots" ADD CONSTRAINT "feed_snapshots_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
