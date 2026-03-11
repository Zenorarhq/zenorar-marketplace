-- Virtual Cards System Migration
-- Supports Sudo Africa, Lithic, and Reloadly providers

-- User virtual cards (unified table for all providers)
CREATE TABLE IF NOT EXISTS user_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL, -- 'sudo' | 'lithic' | 'reloadly'
  provider_card_id VARCHAR(255),
  card_type VARCHAR(20) NOT NULL, -- 'virtual' | 'instant'
  card_brand VARCHAR(20) DEFAULT 'visa', -- 'visa' | 'mastercard'
  card_last_four VARCHAR(4),
  card_number_encrypted TEXT, -- Encrypted card number (for instant cards)
  card_cvv_encrypted TEXT, -- Encrypted CVV
  card_expiry VARCHAR(7), -- MM/YYYY
  currency VARCHAR(3) DEFAULT 'USD',
  balance DECIMAL(12,2) DEFAULT 0,
  denomination DECIMAL(12,2), -- For instant cards (fixed value)
  status VARCHAR(20) DEFAULT 'active', -- active, frozen, used, expired
  nickname VARCHAR(100),
  is_premium BOOLEAN DEFAULT false, -- True for Lithic (3D Secure)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'
);

-- Card transactions
CREATE TABLE IF NOT EXISTS card_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES user_cards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL,
  provider_tx_id VARCHAR(255),
  type VARCHAR(20) NOT NULL, -- 'purchase' | 'refund' | 'top_up' | 'creation' | 'spend'
  amount DECIMAL(12,2) NOT NULL,
  fee DECIMAL(12,2) DEFAULT 0,
  merchant_name VARCHAR(255),
  merchant_category VARCHAR(100),
  status VARCHAR(20) DEFAULT 'completed', -- pending, completed, failed
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Card pricing configuration (admin-configurable)
CREATE TABLE IF NOT EXISTS card_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(20) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  creation_fee DECIMAL(10,2) DEFAULT 0,
  top_up_fee_percent DECIMAL(5,2) DEFAULT 0,
  instant_markup_percent DECIMAL(5,2) DEFAULT 0,
  min_top_up DECIMAL(10,2) DEFAULT 5,
  max_top_up DECIMAL(10,2) DEFAULT 10000,
  min_denomination DECIMAL(10,2) DEFAULT 5,
  max_denomination DECIMAL(10,2) DEFAULT 500,
  is_enabled BOOLEAN DEFAULT true,
  features JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default pricing
INSERT INTO card_pricing (provider, display_name, creation_fee, top_up_fee_percent, instant_markup_percent, features) VALUES
  ('sudo', 'Virtual Card', 3.00, 2.0, 0, '{"description": "USD Visa card optimized for Africa"}'),
  ('lithic', 'Premium Card', 5.00, 2.5, 0, '{"3d_secure": true, "description": "Premium card with 3D Secure"}'),
  ('reloadly', 'Instant Card', 0, 0, 5.0, '{"instant": true, "description": "Instant one-time use card"}')
ON CONFLICT (provider) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_cards_user_id ON user_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cards_status ON user_cards(status);
CREATE INDEX IF NOT EXISTS idx_user_cards_provider ON user_cards(provider);
CREATE INDEX IF NOT EXISTS idx_user_cards_card_type ON user_cards(card_type);
CREATE INDEX IF NOT EXISTS idx_card_transactions_card_id ON card_transactions(card_id);
CREATE INDEX IF NOT EXISTS idx_card_transactions_user_id ON card_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_card_transactions_created_at ON card_transactions(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_card_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_cards updated_at
DROP TRIGGER IF EXISTS trigger_user_cards_updated_at ON user_cards;
CREATE TRIGGER trigger_user_cards_updated_at
  BEFORE UPDATE ON user_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_card_updated_at();

-- Function to auto-expire cards (call via cron or on fetch)
CREATE OR REPLACE FUNCTION expire_virtual_cards()
RETURNS void AS $$
BEGIN
  UPDATE user_cards
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
