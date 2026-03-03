-- OTP Numbers System Tables
-- For one-time verification code receiving services (SMSPool, 5sim, etc.)

-- User OTP Number Purchases
CREATE TABLE IF NOT EXISTS user_otp_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Provider info
  provider VARCHAR(50) NOT NULL, -- smspool, 5sim
  provider_order_id VARCHAR(100) NOT NULL,

  -- Number details
  phone_number VARCHAR(30) NOT NULL,
  country_code VARCHAR(5) NOT NULL,
  service_id VARCHAR(100) NOT NULL,

  -- Pricing
  price DECIMAL(10,4) NOT NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- pending, received, cancelled, expired

  -- SMS data
  sms_code VARCHAR(20),
  full_sms TEXT,

  -- Timestamps
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_otp_user ON user_otp_numbers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_otp_status ON user_otp_numbers(status);
CREATE INDEX IF NOT EXISTS idx_user_otp_provider ON user_otp_numbers(provider, provider_order_id);
CREATE INDEX IF NOT EXISTS idx_user_otp_expires ON user_otp_numbers(expires_at) WHERE status = 'pending';

-- OTP Services cache (for faster browsing)
CREATE TABLE IF NOT EXISTS otp_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL,
  service_id VARCHAR(100) NOT NULL,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  icon VARCHAR(255),
  is_popular BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, service_id)
);

-- OTP Countries cache
CREATE TABLE IF NOT EXISTS otp_countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL,
  country_code VARCHAR(5) NOT NULL,
  name VARCHAR(100) NOT NULL,
  flag_emoji VARCHAR(10),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, country_code)
);

-- OTP Pricing cache (updates periodically)
CREATE TABLE IF NOT EXISTS otp_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL,
  service_id VARCHAR(100) NOT NULL,
  country_code VARCHAR(5) NOT NULL,
  price DECIMAL(10,4) NOT NULL,
  our_price DECIMAL(10,4), -- Our markup price
  in_stock BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, service_id, country_code)
);

CREATE INDEX IF NOT EXISTS idx_otp_pricing_lookup ON otp_pricing(service_id, country_code);

-- Insert popular services
INSERT INTO otp_services (provider, service_id, name, slug, is_popular, display_order)
VALUES
  ('smspool', 'whatsapp', 'WhatsApp', 'whatsapp', true, 1),
  ('smspool', 'telegram', 'Telegram', 'telegram', true, 2),
  ('smspool', 'google', 'Google/Gmail', 'google', true, 3),
  ('smspool', 'facebook', 'Facebook', 'facebook', true, 4),
  ('smspool', 'instagram', 'Instagram', 'instagram', true, 5),
  ('smspool', 'twitter', 'Twitter/X', 'twitter', true, 6),
  ('smspool', 'discord', 'Discord', 'discord', true, 7),
  ('smspool', 'tiktok', 'TikTok', 'tiktok', true, 8),
  ('5sim', 'whatsapp', 'WhatsApp', 'whatsapp', true, 1),
  ('5sim', 'telegram', 'Telegram', 'telegram', true, 2),
  ('5sim', 'google', 'Google/Gmail', 'google', true, 3),
  ('5sim', 'facebook', 'Facebook', 'facebook', true, 4),
  ('5sim', 'instagram', 'Instagram', 'instagram', true, 5),
  ('5sim', 'twitter', 'Twitter/X', 'twitter', true, 6),
  ('5sim', 'discord', 'Discord', 'discord', true, 7),
  ('5sim', 'tiktok', 'TikTok', 'tiktok', true, 8)
ON CONFLICT (provider, service_id) DO UPDATE SET
  name = EXCLUDED.name,
  is_popular = EXCLUDED.is_popular;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_otp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_otp_numbers_updated_at ON user_otp_numbers;
CREATE TRIGGER update_user_otp_numbers_updated_at
  BEFORE UPDATE ON user_otp_numbers
  FOR EACH ROW EXECUTE FUNCTION update_otp_updated_at();

DROP TRIGGER IF EXISTS update_otp_services_updated_at ON otp_services;
CREATE TRIGGER update_otp_services_updated_at
  BEFORE UPDATE ON otp_services
  FOR EACH ROW EXECUTE FUNCTION update_otp_updated_at();

COMMENT ON TABLE user_otp_numbers IS 'User purchases of one-time verification numbers';
COMMENT ON TABLE otp_services IS 'Cached list of services available for OTP';
COMMENT ON TABLE otp_countries IS 'Cached list of countries available for OTP';
COMMENT ON TABLE otp_pricing IS 'Cached pricing for service+country combinations';
