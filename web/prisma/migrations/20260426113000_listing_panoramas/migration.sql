-- CreateTable
CREATE TABLE "ListingPanorama" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "src" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingPanorama_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListingPanorama_listingId_idx" ON "ListingPanorama"("listingId");

-- AddForeignKey
ALTER TABLE "ListingPanorama" ADD CONSTRAINT "ListingPanorama_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
