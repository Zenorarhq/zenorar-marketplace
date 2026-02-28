-- Gift Cards System Tables
-- Migration 032: Create gift card products, inventory, and user purchase tables

-- Gift card brands/products (what users browse and purchase)
CREATE TABLE IF NOT EXISTS gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  image_url TEXT,
  denominations JSONB NOT NULL DEFAULT '[]',
  discount_percent DECIMAL(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  min_custom_amount DECIMAL(10,2),
  max_custom_amount DECIMAL(10,2),
  -- Provider info for API-sourced cards
  provider VARCHAR(50), -- 'bulk', 'reloadly', etc.
  provider_product_id VARCHAR(100),
  provider_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gift card inventory (codes/pins from bulk imports)
CREATE TABLE IF NOT EXISTS gift_card_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id UUID REFERENCES gift_cards(id) ON DELETE CASCADE,
  denomination DECIMAL(10,2) NOT NULL,
  code VARCHAR(255) NOT NULL,
  pin VARCHAR(100),
  status VARCHAR(20) DEFAULT 'available', -- available, reserved, sold, expired, invalid
  cost_price DECIMAL(10,2),
  batch_id VARCHAR(100),
  expires_at TIMESTAMPTZ,
  -- Reservation tracking (for cart holds)
  reserved_at TIMESTAMPTZ,
  reserved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  reservation_expires_at TIMESTAMPTZ,
  -- Sale tracking
  sold_at TIMESTAMPTZ,
  sold_to TEXT REFERENCES users(id) ON DELETE SET NULL,
  order_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User's purchased gift cards (their library of codes)
CREATE TABLE IF NOT EXISTS user_gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gift_card_id UUID REFERENCES gift_cards(id) ON DELETE SET NULL,
  gift_card_code_id UUID REFERENCES gift_card_codes(id) ON DELETE SET NULL,
  order_id UUID,
  -- Denormalized for easy display
  brand VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  image_url TEXT,
  denomination DECIMAL(10,2) NOT NULL,
  -- The actual code/pin
  code VARCHAR(255) NOT NULL,
  pin VARCHAR(100),
  -- Status tracking
  status VARCHAR(20) DEFAULT 'delivered', -- delivered, redeemed, expired
  source VARCHAR(20) DEFAULT 'bulk', -- bulk, reloadly, manual
  delivered_at TIMESTAMPTZ DEFAULT NOW(),
  redeemed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  -- Provider info for API-sourced cards
  provider_order_id VARCHAR(100),
  provider_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Import batches for tracking bulk imports
CREATE TABLE IF NOT EXISTS gift_card_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id VARCHAR(100) UNIQUE NOT NULL,
  gift_card_id UUID REFERENCES gift_cards(id) ON DELETE CASCADE,
  filename VARCHAR(255),
  total_codes INTEGER DEFAULT 0,
  successful_codes INTEGER DEFAULT 0,
  failed_codes INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'processing', -- processing, completed, failed
  error_log JSONB,
  imported_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_gift_cards_category ON gift_cards(category);
CREATE INDEX IF NOT EXISTS idx_gift_cards_slug ON gift_cards(slug);
CREATE INDEX IF NOT EXISTS idx_gift_cards_is_active ON gift_cards(is_active);
CREATE INDEX IF NOT EXISTS idx_gift_cards_is_featured ON gift_cards(is_featured);

CREATE INDEX IF NOT EXISTS idx_gift_card_codes_status ON gift_card_codes(status);
CREATE INDEX IF NOT EXISTS idx_gift_card_codes_gift_card_id ON gift_card_codes(gift_card_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_codes_denomination ON gift_card_codes(denomination);
CREATE INDEX IF NOT EXISTS idx_gift_card_codes_batch_id ON gift_card_codes(batch_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_codes_reservation ON gift_card_codes(reserved_by, reservation_expires_at) WHERE status = 'reserved';

CREATE INDEX IF NOT EXISTS idx_user_gift_cards_user_id ON user_gift_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_gift_cards_status ON user_gift_cards(status);
CREATE INDEX IF NOT EXISTS idx_user_gift_cards_order_id ON user_gift_cards(order_id);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_gift_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for gift_cards
DROP TRIGGER IF EXISTS gift_cards_updated_at ON gift_cards;
CREATE TRIGGER gift_cards_updated_at
  BEFORE UPDATE ON gift_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_gift_cards_updated_at();

-- Function to release expired reservations
CREATE OR REPLACE FUNCTION release_expired_gift_card_reservations()
RETURNS INTEGER AS $$
DECLARE
  released_count INTEGER;
BEGIN
  UPDATE gift_card_codes
  SET status = 'available',
      reserved_at = NULL,
      reserved_by = NULL,
      reservation_expires_at = NULL
  WHERE status = 'reserved'
    AND reservation_expires_at < NOW();

  GET DIAGNOSTICS released_count = ROW_COUNT;
  RETURN released_count;
END;
$$ LANGUAGE plpgsql;
