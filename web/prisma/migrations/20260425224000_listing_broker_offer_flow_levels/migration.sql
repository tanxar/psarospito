-- Extend broker-offer flow states for owner->broker handshake
DO $$
BEGIN
  ALTER TYPE "ListingBrokerOfferStatus" ADD VALUE IF NOT EXISTS 'BROKER_ACCEPTED';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Direction of offer initiation
CREATE TYPE "ListingBrokerOfferDirection" AS ENUM ('BROKER_TO_OWNER', 'OWNER_TO_BROKER');

ALTER TABLE "ListingBrokerOffer"
ADD COLUMN "direction" "ListingBrokerOfferDirection" NOT NULL DEFAULT 'BROKER_TO_OWNER';
