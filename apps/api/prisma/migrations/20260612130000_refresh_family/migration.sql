-- Refresh-token rotation/family columns (§A2). Clear transient session rows first (forces re-login).
DELETE FROM "RefreshToken";

-- AlterTable
ALTER TABLE "RefreshToken" ADD COLUMN     "deviceId" TEXT,
ADD COLUMN     "deviceLabel" TEXT,
ADD COLUMN     "familyId" TEXT NOT NULL,
ADD COLUMN     "jti" TEXT NOT NULL,
ADD COLUMN     "replacedById" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_jti_key" ON "RefreshToken"("jti");

-- CreateIndex
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");

