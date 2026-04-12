-- Postgres schema (mirrors Drizzle schema)

CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  price_eur INTEGER NOT NULL,
  rooms_count INTEGER NOT NULL,
  sqm INTEGER NOT NULL,
  lat TEXT NOT NULL,
  lng TEXT NOT NULL,
  highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  cover_image_src TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS listings_active_idx ON listings (is_active);
CREATE INDEX IF NOT EXISTS listings_price_idx ON listings (price_eur);

CREATE TABLE IF NOT EXISTS listing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  src TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS listing_images_listing_idx ON listing_images (listing_id);

