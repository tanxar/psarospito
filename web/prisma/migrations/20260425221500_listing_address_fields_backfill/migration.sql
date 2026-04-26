-- Backfill migration to align migration history with existing DB schema
-- without dropping data.

ALTER TABLE "Listing"
ADD COLUMN IF NOT EXISTS "addressLine" TEXT;

ALTER TABLE "Listing"
ADD COLUMN IF NOT EXISTS "addressVisibility" TEXT;

UPDATE "Listing"
SET "addressLine" = ''
WHERE "addressLine" IS NULL;

UPDATE "Listing"
SET "addressVisibility" = 'approximate'
WHERE "addressVisibility" IS NULL;

ALTER TABLE "Listing"
ALTER COLUMN "addressLine" SET DEFAULT '';

ALTER TABLE "Listing"
ALTER COLUMN "addressVisibility" SET DEFAULT 'approximate';

ALTER TABLE "Listing"
ALTER COLUMN "addressLine" SET NOT NULL;

ALTER TABLE "Listing"
ALTER COLUMN "addressVisibility" SET NOT NULL;
