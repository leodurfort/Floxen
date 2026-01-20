-- AlterTable: Add Google OAuth fields to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "google_id" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "auth_provider" TEXT NOT NULL DEFAULT 'email';

-- Make password_hash nullable for Google-only users
ALTER TABLE "User" ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_google_id_key" ON "User"("google_id");
