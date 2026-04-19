-- CreateEnum
CREATE TYPE "ListingResolvedOutcome" AS ENUM ('RENTED', 'SOLD');

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "resolvedOutcome" "ListingResolvedOutcome";
