-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SEEKER', 'BROKER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'SEEKER';
ALTER TABLE "User" ADD COLUMN "brokerCompanyName" TEXT;
ALTER TABLE "User" ADD COLUMN "brokerPhone" TEXT;
ALTER TABLE "User" ADD COLUMN "brokerOnboardingCompleted" BOOLEAN NOT NULL DEFAULT false;
