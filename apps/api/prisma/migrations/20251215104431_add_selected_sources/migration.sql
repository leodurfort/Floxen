-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "selected_sources" JSONB NOT NULL DEFAULT '{}';
