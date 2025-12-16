-- CreateTable
CREATE TABLE "openai_fields" (
    "id" TEXT NOT NULL,
    "attribute" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirement" TEXT NOT NULL,
    "example" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "openai_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "woocommerce_fields" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "woocommerce_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_mappings" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "openai_field_id" TEXT NOT NULL,
    "woo_field_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "openai_fields_attribute_key" ON "openai_fields"("attribute");

-- CreateIndex
CREATE UNIQUE INDEX "woocommerce_fields_value_key" ON "woocommerce_fields"("value");

-- CreateIndex
CREATE INDEX "field_mappings_shop_id_idx" ON "field_mappings"("shop_id");

-- CreateIndex
CREATE INDEX "field_mappings_openai_field_id_idx" ON "field_mappings"("openai_field_id");

-- CreateIndex
CREATE INDEX "field_mappings_woo_field_id_idx" ON "field_mappings"("woo_field_id");

-- CreateIndex
CREATE UNIQUE INDEX "field_mappings_shop_id_openai_field_id_key" ON "field_mappings"("shop_id", "openai_field_id");

-- AddForeignKey
ALTER TABLE "field_mappings" ADD CONSTRAINT "field_mappings_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_mappings" ADD CONSTRAINT "field_mappings_openai_field_id_fkey" FOREIGN KEY ("openai_field_id") REFERENCES "openai_fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_mappings" ADD CONSTRAINT "field_mappings_woo_field_id_fkey" FOREIGN KEY ("woo_field_id") REFERENCES "woocommerce_fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;
