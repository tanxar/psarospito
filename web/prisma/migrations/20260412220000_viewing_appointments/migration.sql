-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "ownerUserId" TEXT;

-- CreateIndex
CREATE INDEX "Listing_ownerUserId_idx" ON "Listing"("ownerUserId");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ViewingAppointment" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "seekerId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "message" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ViewingAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ViewingAppointment_listingId_idx" ON "ViewingAppointment"("listingId");
CREATE INDEX "ViewingAppointment_seekerId_idx" ON "ViewingAppointment"("seekerId");
CREATE INDEX "ViewingAppointment_hostId_idx" ON "ViewingAppointment"("hostId");
CREATE INDEX "ViewingAppointment_startsAt_idx" ON "ViewingAppointment"("startsAt");

-- AddForeignKey
ALTER TABLE "ViewingAppointment" ADD CONSTRAINT "ViewingAppointment_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ViewingAppointment" ADD CONSTRAINT "ViewingAppointment_seekerId_fkey" FOREIGN KEY ("seekerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ViewingAppointment" ADD CONSTRAINT "ViewingAppointment_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
