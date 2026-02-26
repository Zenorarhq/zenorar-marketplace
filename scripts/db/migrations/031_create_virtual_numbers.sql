-- Virtual Numbers System Tables
-- Supports: Twilio, Plivo providers with SMS/Voice capabilities

-- =====================================================
-- 1. Virtual Number Countries
-- =====================================================
CREATE TABLE IF NOT EXISTS virtual_number_countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,           -- "United States"
  iso_code VARCHAR(2) NOT NULL,         -- "US"
  dial_code VARCHAR(10) NOT NULL,       -- "+1"
  flag_emoji VARCHAR(10),               -- "🇺🇸"

  -- Capabilities
  sms_enabled BOOLEAN DEFAULT true,
  voice_enabled BOOLEAN DEFAULT true,
  mms_enabled BOOLEAN DEFAULT false,

  -- Provider info
  provider VARCHAR(50) NOT NULL DEFAULT 'twilio',
  provider_country_code VARCHAR(10),

  -- Pricing (what we pay)
  cost_monthly DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  cost_sms_inbound DECIMAL(10,4) DEFAULT 0.0075,
  cost_sms_outbound DECIMAL(10,4) DEFAULT 0.0079,
  cost_voice_inbound DECIMAL(10,4) DEFAULT 0.0085,
  cost_voice_outbound DECIMAL(10,4) DEFAULT 0.013,

  -- Retail pricing
  retail_monthly DECIMAL(10,2) DEFAULT 5.00,

  -- Status
  is_active BOOLEAN DEFAULT true,
  stock_available BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vn_countries_iso ON virtual_number_countries(iso_code);
CREATE INDEX IF NOT EXISTS idx_vn_countries_active ON virtual_number_countries(is_active) WHERE is_active = true;

-- =====================================================
-- 2. Number Types (local, toll-free, mobile)
-- =====================================================
CREATE TABLE IF NOT EXISTS virtual_number_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,            -- "Local", "Toll-Free", "Mobile"
  slug VARCHAR(50) UNIQUE NOT NULL,     -- "local", "toll-free", "mobile"
  description TEXT,
  price_multiplier DECIMAL(5,2) DEFAULT 1.0,
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default number types
INSERT INTO virtual_number_types (name, slug, description, price_multiplier, display_order)
VALUES
  ('Local', 'local', 'Local phone numbers with area codes', 1.0, 1),
  ('Toll-Free', 'toll-free', 'Toll-free numbers (800, 888, etc.)', 1.5, 2),
  ('Mobile', 'mobile', 'Mobile phone numbers', 1.2, 3)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- 3. Subscription Plans
-- =====================================================
CREATE TABLE IF NOT EXISTS virtual_number_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,           -- "Basic SMS", "Pro", "Business"
  slug VARCHAR(100) UNIQUE NOT NULL,

  -- Duration
  duration_type VARCHAR(20) NOT NULL DEFAULT 'monthly',
  duration_days INT NOT NULL DEFAULT 30,

  -- Included usage
  sms_included INT DEFAULT 100,
  voice_minutes_included INT DEFAULT 0,
  unlimited_sms BOOLEAN DEFAULT false,
  unlimited_voice BOOLEAN DEFAULT false,

  -- Pricing
  base_price DECIMAL(10,2) NOT NULL,
  sms_overage_price DECIMAL(10,4) DEFAULT 0.05,
  voice_overage_price DECIMAL(10,4) DEFAULT 0.10,

  -- Features
  features JSONB DEFAULT '[]',

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default plans
INSERT INTO virtual_number_plans (name, slug, duration_type, duration_days, sms_included, voice_minutes_included, base_price, features, is_featured, display_order)
VALUES
  ('Basic SMS', 'basic-sms', 'monthly', 30, 100, 0, 5.00, '["SMS Forwarding", "Email Notifications"]', false, 1),
  ('Pro', 'pro', 'monthly', 30, 500, 60, 12.00, '["SMS Forwarding", "Voice Forwarding", "Email Notifications", "Voicemail"]', true, 2),
  ('Business', 'business', 'monthly', 30, 0, 0, 25.00, '["Unlimited SMS", "Unlimited Voice", "SMS Forwarding", "Voice Forwarding", "Email Notifications", "Voicemail", "Priority Support"]', false, 3),
  ('Temporary', 'temporary', 'daily', 1, 50, 0, 2.00, '["SMS Only", "24-Hour Access"]', false, 4),
  ('Weekly', 'weekly', 'weekly', 7, 200, 0, 8.00, '["SMS Forwarding", "7-Day Access"]', false, 5)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  sms_included = EXCLUDED.sms_included,
  voice_minutes_included = EXCLUDED.voice_minutes_included,
  base_price = EXCLUDED.base_price,
  features = EXCLUDED.features;

-- Update unlimited flags for Business plan
UPDATE virtual_number_plans SET unlimited_sms = true, unlimited_voice = true WHERE slug = 'business';

-- =====================================================
-- 4. User Virtual Numbers
-- =====================================================
CREATE TABLE IF NOT EXISTS user_virtual_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES virtual_number_plans(id),
  country_id UUID NOT NULL REFERENCES virtual_number_countries(id),

  -- The actual number
  phone_number VARCHAR(20) NOT NULL,
  phone_number_display VARCHAR(30),
  number_type VARCHAR(20) DEFAULT 'local',

  -- Provider info
  provider VARCHAR(50) NOT NULL DEFAULT 'twilio',
  provider_number_sid VARCHAR(50),

  -- Subscription
  status VARCHAR(20) DEFAULT 'active',
  order_id TEXT REFERENCES orders(id),

  started_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  next_billing_at TIMESTAMP,
  cancelled_at TIMESTAMP,

  -- Configuration
  sms_forwarding_enabled BOOLEAN DEFAULT true,
  sms_forward_to VARCHAR(20),
  sms_forward_email VARCHAR(255),

  voice_forwarding_enabled BOOLEAN DEFAULT false,
  voice_forward_to VARCHAR(20),

  voicemail_enabled BOOLEAN DEFAULT false,
  voicemail_greeting_url VARCHAR(500),

  -- Usage tracking
  sms_sent_count INT DEFAULT 0,
  sms_received_count INT DEFAULT 0,
  voice_minutes_used INT DEFAULT 0,
  current_period_sms INT DEFAULT 0,
  current_period_voice INT DEFAULT 0,

  -- Metadata
  nickname VARCHAR(100),
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uvn_user ON user_virtual_numbers(user_id);
CREATE INDEX IF NOT EXISTS idx_uvn_phone ON user_virtual_numbers(phone_number);
CREATE INDEX IF NOT EXISTS idx_uvn_status ON user_virtual_numbers(status);
CREATE INDEX IF NOT EXISTS idx_uvn_expires ON user_virtual_numbers(expires_at);
CREATE INDEX IF NOT EXISTS idx_uvn_provider_sid ON user_virtual_numbers(provider_number_sid);

-- =====================================================
-- 5. SMS Message Log
-- =====================================================
CREATE TABLE IF NOT EXISTS virtual_number_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  virtual_number_id UUID NOT NULL REFERENCES user_virtual_numbers(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),

  -- Message details
  direction VARCHAR(10) NOT NULL,
  from_number VARCHAR(20) NOT NULL,
  to_number VARCHAR(20) NOT NULL,
  body TEXT,
  media_urls TEXT[],

  -- Provider tracking
  provider_message_sid VARCHAR(50),
  status VARCHAR(20) DEFAULT 'delivered',

  -- Forwarding
  forwarded_to VARCHAR(255),
  forwarded_at TIMESTAMP,

  -- Cost
  cost DECIMAL(10,4),

  -- Read status
  is_read BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vnm_number ON virtual_number_messages(virtual_number_id);
CREATE INDEX IF NOT EXISTS idx_vnm_user ON virtual_number_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_vnm_created ON virtual_number_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_vnm_direction ON virtual_number_messages(direction);

-- =====================================================
-- 6. Voice Call Log
-- =====================================================
CREATE TABLE IF NOT EXISTS virtual_number_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  virtual_number_id UUID NOT NULL REFERENCES user_virtual_numbers(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),

  -- Call details
  direction VARCHAR(10) NOT NULL,
  from_number VARCHAR(20) NOT NULL,
  to_number VARCHAR(20) NOT NULL,
  duration_seconds INT DEFAULT 0,
  status VARCHAR(20),

  -- Provider tracking
  provider_call_sid VARCHAR(50),

  -- Recording
  recording_url VARCHAR(500),
  voicemail_url VARCHAR(500),

  -- Cost
  cost DECIMAL(10,4),

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vnc_number ON virtual_number_calls(virtual_number_id);
CREATE INDEX IF NOT EXISTS idx_vnc_user ON virtual_number_calls(user_id);
CREATE INDEX IF NOT EXISTS idx_vnc_created ON virtual_number_calls(created_at);

-- =====================================================
-- 7. Provision Log (for debugging/retry)
-- =====================================================
CREATE TABLE IF NOT EXISTS virtual_number_provision_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id),
  order_id TEXT REFERENCES orders(id),
  country_id UUID REFERENCES virtual_number_countries(id),
  plan_id UUID REFERENCES virtual_number_plans(id),

  phone_number VARCHAR(20),
  provider VARCHAR(50),

  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  retry_count INT DEFAULT 0,

  user_virtual_number_id UUID REFERENCES user_virtual_numbers(id),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vnpl_status ON virtual_number_provision_log(status, retry_count);
CREATE INDEX IF NOT EXISTS idx_vnpl_order ON virtual_number_provision_log(order_id);

-- =====================================================
-- Update triggers for updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_vn_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_vn_countries_updated_at ON virtual_number_countries;
CREATE TRIGGER update_vn_countries_updated_at
  BEFORE UPDATE ON virtual_number_countries
  FOR EACH ROW EXECUTE FUNCTION update_vn_updated_at();

DROP TRIGGER IF EXISTS update_vn_plans_updated_at ON virtual_number_plans;
CREATE TRIGGER update_vn_plans_updated_at
  BEFORE UPDATE ON virtual_number_plans
  FOR EACH ROW EXECUTE FUNCTION update_vn_updated_at();

DROP TRIGGER IF EXISTS update_uvn_updated_at ON user_virtual_numbers;
CREATE TRIGGER update_uvn_updated_at
  BEFORE UPDATE ON user_virtual_numbers
  FOR EACH ROW EXECUTE FUNCTION update_vn_updated_at();

DROP TRIGGER IF EXISTS update_vnpl_updated_at ON virtual_number_provision_log;
CREATE TRIGGER update_vnpl_updated_at
  BEFORE UPDATE ON virtual_number_provision_log
  FOR EACH ROW EXECUTE FUNCTION update_vn_updated_at();

-- =====================================================
-- Insert sample countries
-- =====================================================
INSERT INTO virtual_number_countries (name, iso_code, dial_code, flag_emoji, cost_monthly, retail_monthly, display_order)
VALUES
  ('United States', 'US', '+1', '🇺🇸', 1.00, 5.00, 1),
  ('United Kingdom', 'GB', '+44', '🇬🇧', 1.50, 6.00, 2),
  ('Canada', 'CA', '+1', '🇨🇦', 1.00, 5.00, 3),
  ('Germany', 'DE', '+49', '🇩🇪', 1.50, 6.00, 4),
  ('France', 'FR', '+33', '🇫🇷', 1.50, 6.00, 5),
  ('Australia', 'AU', '+61', '🇦🇺', 2.00, 8.00, 6),
  ('Japan', 'JP', '+81', '🇯🇵', 3.00, 10.00, 7),
  ('Singapore', 'SG', '+65', '🇸🇬', 2.00, 8.00, 8)
ON CONFLICT (iso_code) DO UPDATE SET
  name = EXCLUDED.name,
  dial_code = EXCLUDED.dial_code,
  cost_monthly = EXCLUDED.cost_monthly,
  retail_monthly = EXCLUDED.retail_monthly;

-- =====================================================
-- Comments for documentation
-- =====================================================
COMMENT ON TABLE virtual_number_countries IS 'Available countries for virtual phone numbers';
COMMENT ON TABLE virtual_number_types IS 'Types of phone numbers (local, toll-free, mobile)';
COMMENT ON TABLE virtual_number_plans IS 'Subscription plans for virtual numbers';
COMMENT ON TABLE user_virtual_numbers IS 'User purchased virtual numbers with configuration';
COMMENT ON TABLE virtual_number_messages IS 'SMS message log for virtual numbers';
COMMENT ON TABLE virtual_number_calls IS 'Voice call log for virtual numbers';
COMMENT ON COLUMN user_virtual_numbers.status IS 'active, suspended, expired, cancelled';
COMMENT ON COLUMN user_virtual_numbers.current_period_sms IS 'SMS count for current billing period, reset on renewal';
