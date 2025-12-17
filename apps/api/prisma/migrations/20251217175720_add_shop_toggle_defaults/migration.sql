-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "default_enable_checkout" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "default_enable_search" BOOLEAN NOT NULL DEFAULT true;
