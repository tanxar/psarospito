-- CreateEnum
CREATE TYPE "ListingBrokerOfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ListingBrokerOffer" (
  "id" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "brokerUserId" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "message" TEXT,
  "status" "ListingBrokerOfferStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "respondedAt" TIMESTAMP(3),

  CONSTRAINT "ListingBrokerOffer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListingBrokerOffer_listingId_idx" ON "ListingBrokerOffer"("listingId");

-- CreateIndex
CREATE INDEX "ListingBrokerOffer_brokerUserId_idx" ON "ListingBrokerOffer"("brokerUserId");

-- CreateIndex
CREATE INDEX "ListingBrokerOffer_ownerUserId_status_idx" ON "ListingBrokerOffer"("ownerUserId", "status");

-- CreateIndex
CREATE INDEX "ListingBrokerOffer_listingId_status_idx" ON "ListingBrokerOffer"("listingId", "status");

-- AddForeignKey
ALTER TABLE "ListingBrokerOffer"
ADD CONSTRAINT "ListingBrokerOffer_listingId_fkey"
FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingBrokerOffer"
ADD CONSTRAINT "ListingBrokerOffer_brokerUserId_fkey"
FOREIGN KEY ("brokerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingBrokerOffer"
ADD CONSTRAINT "ListingBrokerOffer_ownerUserId_fkey"
FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
