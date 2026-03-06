-- Virtual Number Pricing & Multi-Provider System
-- Enables dynamic pricing based on provider costs with admin-configurable markups
-- Supports multiple providers (Twilio, Vonage, Plivo, etc.)

-- =====================================================
-- 1. Virtual Number Providers Table
-- =====================================================
CREATE TABLE IF NOT EXISTS virtual_number_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,

  -- Provider status
  is_enabled BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,

  -- API Credentials (encrypted in practice)
  api_key TEXT,
  api_secret TEXT,
  account_sid TEXT,  -- For Twilio-style providers
  auth_token TEXT,   -- For Twilio-style providers
  webhook_secret TEXT,

  -- Additional config as JSON
  config JSONB DEFAULT '{}',

  -- Provider capabilities
  supports_sms BOOLEAN DEFAULT true,
  supports_voice BOOLEAN DEFAULT true,
  supports_mms BOOLEAN DEFAULT false,

  -- Countries this provider covers (null = all)
  supported_countries TEXT[],

  -- Priority for selection (lower = higher priority)
  priority INT DEFAULT 100,

  -- Metadata
  last_health_check TIMESTAMP,
  health_status VARCHAR(20) DEFAULT 'unknown', -- 'healthy', 'degraded', 'down', 'unknown'

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Only one default provider
CREATE UNIQUE INDEX IF NOT EXISTS idx_vnp_default ON virtual_number_providers(is_default) WHERE is_default = true;

-- Insert default providers (credentials to be set by admin)
INSERT INTO virtual_number_providers (name, slug, is_enabled, is_default, priority, supports_mms)
VALUES
  ('Twilio', 'twilio', false, true, 1, true),
  ('Vonage', 'vonage', false, false, 2, false),
  ('Plivo', 'plivo', false, false, 3, false),
  ('Bandwidth', 'bandwidth', false, false, 4, true),
  ('Telnyx', 'telnyx', false, false, 5, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  priority = EXCLUDED.priority;

-- =====================================================
-- 2. Provider Pricing Cache
-- Stores fetched pricing from providers to avoid API calls
-- =====================================================
CREATE TABLE IF NOT EXISTS virtual_number_provider_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES virtual_number_providers(id) ON DELETE CASCADE,
  country_code VARCHAR(5) NOT NULL,
  number_type VARCHAR(20) NOT NULL, -- 'local', 'toll-free', 'mobile'

  -- Provider costs
  monthly_cost DECIMAL(10,4) NOT NULL,
  setup_cost DECIMAL(10,4) DEFAULT 0,

  -- Voice costs (per minute)
  inbound_voice_cost DECIMAL(10,6) DEFAULT 0,
  outbound_voice_cost DECIMAL(10,6) DEFAULT 0,

  -- SMS costs (per message)
  inbound_sms_cost DECIMAL(10,6) DEFAULT 0,
  outbound_sms_cost DECIMAL(10,6) DEFAULT 0,

  -- Currency
  currency VARCHAR(3) DEFAULT 'USD',

  -- Cache metadata
  fetched_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours',

  UNIQUE(provider_id, country_code, number_type)
);

CREATE INDEX IF NOT EXISTS idx_vnpp_lookup ON virtual_number_provider_pricing(provider_id, country_code, number_type);
CREATE INDEX IF NOT EXISTS idx_vnpp_expires ON virtual_number_provider_pricing(expires_at);

-- =====================================================
-- 3. Enhanced Pricing Settings
-- =====================================================

-- Remove old settings and add new ones with proper structure
DELETE FROM site_settings WHERE key IN (
  'virtualNumberMarkupPercent',
  'virtualNumberDailyDivisor',
  'callForwardingUsRate',
  'callForwardingIntlRate',
  'smsForwardingRate'
);

-- Insert new comprehensive pricing settings
INSERT INTO site_settings (id, key, value, "group", "isPublic", "createdAt", "updatedAt")
VALUES
  -- Duration multipliers (what % of monthly to charge per duration)
  (gen_random_uuid()::text, 'vn_duration_multiplier_1d', '20', 'virtual_numbers', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'vn_duration_multiplier_7d', '50', 'virtual_numbers', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'vn_duration_multiplier_30d', '100', 'virtual_numbers', false, NOW(), NOW()),

  -- Profit markups (default 500% for numbers, 300% for minutes)
  (gen_random_uuid()::text, 'vn_number_markup_percent', '500', 'virtual_numbers', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'vn_minute_markup_percent', '300', 'virtual_numbers', false, NOW(), NOW()),

  -- Minimum prices (floor price regardless of calculation)
  (gen_random_uuid()::text, 'vn_min_price_1d', '2', 'virtual_numbers', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'vn_min_price_7d', '5', 'virtual_numbers', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'vn_min_price_30d', '10', 'virtual_numbers', false, NOW(), NOW()),

  -- Minute package options (JSON array)
  (gen_random_uuid()::text, 'vn_minute_packages', '[{"minutes":30,"basePrice":0.81},{"minutes":60,"basePrice":1.62},{"minutes":120,"basePrice":3.24}]', 'virtual_numbers', false, NOW(), NOW()),

  -- SMS limits per plan
  (gen_random_uuid()::text, 'vn_sms_limit_1d', '50', 'virtual_numbers', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'vn_sms_limit_7d', '200', 'virtual_numbers', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'vn_sms_limit_30d', '500', 'virtual_numbers', false, NOW(), NOW()),

  -- Business plan base price additions (on top of basic)
  (gen_random_uuid()::text, 'vn_business_addon_1d', '3', 'virtual_numbers', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'vn_business_addon_7d', '12', 'virtual_numbers', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'vn_business_addon_30d', '30', 'virtual_numbers', false, NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  "updatedAt" = NOW();

-- =====================================================
-- 4. Update inventory table for multi-provider
-- =====================================================
ALTER TABLE virtual_number_inventory
ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES virtual_number_providers(id);

-- Migrate existing 'twilio' provider references
UPDATE virtual_number_inventory
SET provider_id = (SELECT id FROM virtual_number_providers WHERE slug = 'twilio')
WHERE provider = 'twilio' AND provider_id IS NULL;

-- =====================================================
-- 5. Provider API Logs (for debugging)
-- =====================================================
CREATE TABLE IF NOT EXISTS virtual_number_provider_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES virtual_number_providers(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL, -- 'search', 'purchase', 'release', 'configure', 'health_check'
  request_data JSONB,
  response_data JSONB,
  success BOOLEAN,
  error_message TEXT,
  duration_ms INT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vnpl_provider ON virtual_number_provider_logs(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vnpl_action ON virtual_number_provider_logs(action, created_at DESC);

-- Cleanup old logs after 30 days (can be run via cron)
-- DELETE FROM virtual_number_provider_logs WHERE created_at < NOW() - INTERVAL '30 days';

-- =====================================================
-- 6. Triggers
-- =====================================================
CREATE OR REPLACE FUNCTION update_vnp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_virtual_number_providers_updated_at ON virtual_number_providers;
CREATE TRIGGER update_virtual_number_providers_updated_at
  BEFORE UPDATE ON virtual_number_providers
  FOR EACH ROW EXECUTE FUNCTION update_vnp_updated_at();

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE virtual_number_providers IS 'Phone number providers (Twilio, Vonage, etc.) with their credentials and config';
COMMENT ON COLUMN virtual_number_providers.is_enabled IS 'Provider is active and can be used if credentials are set';
COMMENT ON COLUMN virtual_number_providers.is_default IS 'System auto-buys from this provider; only one can be default';
COMMENT ON TABLE virtual_number_provider_pricing IS 'Cached pricing from providers to calculate dynamic prices';
COMMENT ON TABLE virtual_number_provider_logs IS 'Audit log for provider API calls';
