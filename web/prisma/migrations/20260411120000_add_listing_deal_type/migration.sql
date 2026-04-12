-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "dealType" TEXT NOT NULL DEFAULT 'rent';

-- CreateIndex
CREATE INDEX "Listing_dealType_idx" ON "Listing"("dealType");
