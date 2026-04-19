-- AlterTable
ALTER TABLE "User" ADD COLUMN "brokerServiceRegions" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "User" ADD COLUMN "brokerPromotionActiveUntil" TIMESTAMP(3);

-- Υπάρχοντες μεσίτες χωρίς περιοχές: προσωρινά πανελλαδική κάλυψη (να στενεύουν από το προφίλ)
UPDATE "User"
SET "brokerServiceRegions" = ARRAY['greece_wide']::TEXT[]
WHERE role = 'BROKER'
  AND "brokerOnboardingCompleted" = true
  AND array_length("brokerServiceRegions", 1) IS NULL;
