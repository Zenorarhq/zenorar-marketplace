-- Migration 058: Add is_staff_pick to non-Script category tables
-- and create featured_phone_refill_operators for Recommended + Staff Picks

-- is_featured for card_pricing (was missing)
ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

-- is_staff_pick for all non-Script tables
ALTER TABLE gift_cards ADD COLUMN IF NOT EXISTS is_staff_pick BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE esim_plans ADD COLUMN IF NOT EXISTS is_staff_pick BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE virtual_number_plans ADD COLUMN IF NOT EXISTS is_staff_pick BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS is_staff_pick BOOLEAN NOT NULL DEFAULT false;

-- Curated phone refill operators table
-- Each row is an operator admin wants to highlight.
-- is_recommended: show in "Recommended for you" panel
-- is_staff_pick: show in "Staff Picks" section
-- Both flags are independent — set one, both, or neither per row.
CREATE TABLE IF NOT EXISTS featured_phone_refill_operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_name TEXT NOT NULL,
  country_code CHAR(2) NOT NULL,
  image_url TEXT,
  is_recommended BOOLEAN NOT NULL DEFAULT false,
  is_staff_pick BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
