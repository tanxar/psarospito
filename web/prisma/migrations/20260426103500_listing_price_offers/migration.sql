-- CreateTable
CREATE TABLE "ListingPriceOffer" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "seekerUserId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "amountEur" INTEGER NOT NULL,
    "basePriceEur" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingPriceOffer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListingPriceOffer_listingId_idx" ON "ListingPriceOffer"("listingId");

-- CreateIndex
CREATE INDEX "ListingPriceOffer_seekerUserId_idx" ON "ListingPriceOffer"("seekerUserId");

-- CreateIndex
CREATE INDEX "ListingPriceOffer_ownerUserId_createdAt_idx" ON "ListingPriceOffer"("ownerUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "ListingPriceOffer" ADD CONSTRAINT "ListingPriceOffer_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingPriceOffer" ADD CONSTRAINT "ListingPriceOffer_seekerUserId_fkey" FOREIGN KEY ("seekerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingPriceOffer" ADD CONSTRAINT "ListingPriceOffer_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
