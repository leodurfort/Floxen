-- GIN index for faster JSON queries on openai_auto_filled column
-- This significantly speeds up all filter/search operations on product attributes
-- (brand, color, material, availability, etc.)

CREATE INDEX "Product_openai_auto_filled_idx" ON "Product" USING GIN ("openai_auto_filled");
