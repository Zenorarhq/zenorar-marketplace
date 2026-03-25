-- Migration 060: Add curated flags to user_virtual_numbers
--
-- Enables admins to feature individual phone numbers (not just plans)
-- in the Recommended and Staff Picks sections on the storefront.

ALTER TABLE user_virtual_numbers
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_staff_pick BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_uvn_featured
  ON user_virtual_numbers(is_featured) WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS idx_uvn_staff_pick
  ON user_virtual_numbers(is_staff_pick) WHERE is_staff_pick = true;
