-- DropIndex
DROP INDEX "CustomerProfile_gstin_key";

-- DropIndex
DROP INDEX "User_email_key";

-- DropIndex
DROP INDEX "User_phone_key";

-- AlterTable
ALTER TABLE "CustomerProfile" ADD COLUMN     "gstinIndex" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailIndex" TEXT,
ADD COLUMN     "phoneIndex" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CustomerProfile_gstinIndex_key" ON "CustomerProfile"("gstinIndex");

-- CreateIndex
CREATE UNIQUE INDEX "User_emailIndex_key" ON "User"("emailIndex");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneIndex_key" ON "User"("phoneIndex");

