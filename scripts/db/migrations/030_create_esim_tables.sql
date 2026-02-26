-- eSIM System Tables
-- Supports: API provisioning (multiple providers) + Bulk inventory

-- =====================================================
-- 1. eSIM Regions (Continents/Areas)
-- =====================================================
CREATE TABLE IF NOT EXISTS esim_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,           -- "Europe", "Asia Pacific"
  slug VARCHAR(100) UNIQUE NOT NULL,    -- "europe", "asia-pacific"
  description TEXT,
  image_url VARCHAR(500),
  flag_emoji VARCHAR(10),               -- Optional emoji
  country_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 2. eSIM Countries
-- =====================================================
CREATE TABLE IF NOT EXISTS esim_countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID REFERENCES esim_regions(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,           -- "France"
  iso_code VARCHAR(2) NOT NULL,         -- "FR"
  flag_emoji VARCHAR(10),               -- Flag emoji
  dial_code VARCHAR(10),                -- "+33"
  networks TEXT[],                       -- ["Orange", "SFR", "Bouygues"]
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_esim_countries_iso ON esim_countries(iso_code);
CREATE INDEX IF NOT EXISTS idx_esim_countries_region ON esim_countries(region_id);

-- =====================================================
-- 3. eSIM Providers (API providers we integrate with)
-- =====================================================
CREATE TABLE IF NOT EXISTS esim_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,           -- "Airalo", "eSIM Go"
  slug VARCHAR(100) UNIQUE NOT NULL,    -- "airalo", "esimgo"
  api_base_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  priority INT DEFAULT 1,               -- Lower = higher priority (1 = primary)
  supports_usage_tracking BOOLEAN DEFAULT false,
  supports_topup BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default providers
INSERT INTO esim_providers (name, slug, api_base_url, priority, supports_usage_tracking, supports_topup)
VALUES
  ('Airalo', 'airalo', 'https://partner-api.airalo.com/v2', 1, true, true),
  ('eSIM Go', 'esimgo', 'https://api.esimgo.com/v2.2', 2, false, false)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- 4. eSIM Plans (What we sell)
-- =====================================================
CREATE TABLE IF NOT EXISTS esim_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic info
  name VARCHAR(255) NOT NULL,           -- "Europe 5GB - 30 Days"
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,

  -- Coverage
  region_id UUID REFERENCES esim_regions(id) ON DELETE SET NULL,
  coverage_type VARCHAR(20) NOT NULL DEFAULT 'regional',  -- "single", "regional", "global"
  countries TEXT[],                      -- ISO codes: ["FR", "DE", "IT"]

  -- Data specs
  data_amount_gb DECIMAL(10,2) NOT NULL, -- 5.00
  data_amount_display VARCHAR(50),       -- "5GB" or "Unlimited"
  validity_days INT NOT NULL,            -- 30
  is_unlimited BOOLEAN DEFAULT false,

  -- Voice/SMS (some plans include)
  voice_minutes INT DEFAULT 0,
  sms_count INT DEFAULT 0,

  -- Speed/Quality
  speed_description VARCHAR(100),        -- "4G/LTE" or "5G"
  network_type VARCHAR(20) DEFAULT '4g', -- "4g", "5g", "3g"

  -- Features
  hotspot_allowed BOOLEAN DEFAULT true,
  supports_topup BOOLEAN DEFAULT false,
  activation_policy VARCHAR(20) DEFAULT 'first-use', -- "first-use", "immediate"

  -- Pricing
  cost_price DECIMAL(10,2) NOT NULL,    -- What we pay (API/bulk cost)
  retail_price DECIMAL(10,2) NOT NULL,  -- What we sell for
  currency VARCHAR(3) DEFAULT 'USD',

  -- Provider mapping (for API provisioning)
  provider_id UUID REFERENCES esim_providers(id),
  provider_plan_id VARCHAR(100),         -- Provider's plan identifier

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  stock_available BOOLEAN DEFAULT true,  -- Can be toggled if provider has issues

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_esim_plans_region ON esim_plans(region_id);
CREATE INDEX IF NOT EXISTS idx_esim_plans_coverage ON esim_plans(coverage_type);
CREATE INDEX IF NOT EXISTS idx_esim_plans_active ON esim_plans(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_esim_plans_provider ON esim_plans(provider_id);

-- =====================================================
-- 5. eSIM Bulk Inventory (Pre-purchased eSIMs)
-- =====================================================
CREATE TABLE IF NOT EXISTS esim_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES esim_plans(id) ON DELETE CASCADE,

  -- eSIM credentials (from bulk purchase)
  iccid VARCHAR(30) UNIQUE NOT NULL,     -- Integrated Circuit Card ID
  matching_id VARCHAR(100),              -- For manual installation
  smdp_address VARCHAR(255),             -- SM-DP+ server address
  qr_code_data TEXT NOT NULL,            -- Raw QR code string (LPA:1$...)
  activation_code VARCHAR(255),          -- Alternative activation code

  -- Status
  status VARCHAR(20) DEFAULT 'available', -- 'available', 'reserved', 'sold', 'expired'

  -- Purchase tracking
  order_id UUID REFERENCES orders(id),
  order_item_id UUID,
  sold_to_user_id UUID REFERENCES users(id),
  reserved_at TIMESTAMP,
  sold_at TIMESTAMP,

  -- Cost tracking
  cost_price DECIMAL(10,2),              -- What we paid for this eSIM
  batch_id VARCHAR(100),                 -- Import batch reference

  -- Expiration
  expires_at TIMESTAMP,                  -- When the eSIM itself expires

  -- Provider info (who we bought from)
  source_provider VARCHAR(100),          -- "airalo_bulk", "esimgo_bulk"
  provider_esim_id VARCHAR(100),         -- Provider's eSIM identifier

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_esim_inventory_plan ON esim_inventory(plan_id);
CREATE INDEX IF NOT EXISTS idx_esim_inventory_status ON esim_inventory(status);
CREATE INDEX IF NOT EXISTS idx_esim_inventory_available ON esim_inventory(plan_id, status) WHERE status = 'available';
CREATE INDEX IF NOT EXISTS idx_esim_inventory_iccid ON esim_inventory(iccid);
CREATE INDEX IF NOT EXISTS idx_esim_inventory_order ON esim_inventory(order_id);

-- =====================================================
-- 6. User eSIMs (Purchased/Provisioned eSIMs)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_esims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES esim_plans(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  order_item_id UUID,

  -- Source tracking
  source_type VARCHAR(20) NOT NULL,      -- 'api' or 'bulk'
  inventory_id UUID REFERENCES esim_inventory(id), -- If from bulk

  -- Provider info (for API-provisioned)
  provider_id UUID REFERENCES esim_providers(id),
  provider_order_id VARCHAR(100),        -- Provider's order reference
  provider_esim_id VARCHAR(100),         -- Provider's eSIM identifier

  -- eSIM credentials
  iccid VARCHAR(30),                     -- Integrated Circuit Card ID
  matching_id VARCHAR(100),              -- For manual installation
  smdp_address VARCHAR(255),             -- SM-DP+ server address
  qr_code_data TEXT,                     -- Raw QR code string (LPA:1$...)
  qr_code_url VARCHAR(500),              -- Generated QR image URL (if stored)
  activation_code VARCHAR(255),

  -- Installation instructions (JSON for iOS/Android)
  installation_manual JSONB,

  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'active', 'installed', 'expired', 'error'
  activated_at TIMESTAMP,
  installed_at TIMESTAMP,
  expires_at TIMESTAMP,

  -- Usage tracking (if provider supports)
  data_used_mb DECIMAL(10,2) DEFAULT 0,
  data_remaining_mb DECIMAL(10,2),
  last_usage_sync TIMESTAMP,

  -- Delivery
  delivered_at TIMESTAMP,
  delivery_method VARCHAR(20),           -- 'qr', 'email', 'both'
  delivery_email VARCHAR(255),

  -- Error handling
  error_message TEXT,
  retry_count INT DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_esims_user ON user_esims(user_id);
CREATE INDEX IF NOT EXISTS idx_user_esims_order ON user_esims(order_id);
CREATE INDEX IF NOT EXISTS idx_user_esims_status ON user_esims(status);
CREATE INDEX IF NOT EXISTS idx_user_esims_iccid ON user_esims(iccid);
CREATE INDEX IF NOT EXISTS idx_user_esims_plan ON user_esims(plan_id);

-- =====================================================
-- 7. eSIM Top-ups (For plans that support it)
-- =====================================================
CREATE TABLE IF NOT EXISTS esim_topups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_esim_id UUID NOT NULL REFERENCES user_esims(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  order_id UUID REFERENCES orders(id),

  -- Top-up details
  data_amount_gb DECIMAL(10,2) NOT NULL,
  validity_days INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,

  -- Provider response
  provider_topup_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'completed', 'failed'

  -- New expiry after top-up
  new_expires_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_esim_topups_esim ON esim_topups(user_esim_id);
CREATE INDEX IF NOT EXISTS idx_esim_topups_user ON esim_topups(user_id);

-- =====================================================
-- 8. eSIM Provision Log (For debugging/retry)
-- =====================================================
CREATE TABLE IF NOT EXISTS esim_provision_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES esim_plans(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  order_item_id UUID,
  user_id UUID NOT NULL REFERENCES users(id),

  -- Provisioning attempt
  provider_id UUID REFERENCES esim_providers(id),
  attempt_type VARCHAR(20) NOT NULL,     -- 'bulk', 'api'
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'success', 'failed'

  -- Error tracking
  error_message TEXT,
  error_code VARCHAR(50),
  retry_count INT DEFAULT 0,

  -- Result
  user_esim_id UUID REFERENCES user_esims(id),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_esim_provision_log_status ON esim_provision_log(status, retry_count);
CREATE INDEX IF NOT EXISTS idx_esim_provision_log_order ON esim_provision_log(order_id);

-- =====================================================
-- Update trigger for updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_esim_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_esim_regions_updated_at ON esim_regions;
CREATE TRIGGER update_esim_regions_updated_at
  BEFORE UPDATE ON esim_regions
  FOR EACH ROW EXECUTE FUNCTION update_esim_updated_at();

DROP TRIGGER IF EXISTS update_esim_countries_updated_at ON esim_countries;
CREATE TRIGGER update_esim_countries_updated_at
  BEFORE UPDATE ON esim_countries
  FOR EACH ROW EXECUTE FUNCTION update_esim_updated_at();

DROP TRIGGER IF EXISTS update_esim_plans_updated_at ON esim_plans;
CREATE TRIGGER update_esim_plans_updated_at
  BEFORE UPDATE ON esim_plans
  FOR EACH ROW EXECUTE FUNCTION update_esim_updated_at();

DROP TRIGGER IF EXISTS update_esim_inventory_updated_at ON esim_inventory;
CREATE TRIGGER update_esim_inventory_updated_at
  BEFORE UPDATE ON esim_inventory
  FOR EACH ROW EXECUTE FUNCTION update_esim_updated_at();

DROP TRIGGER IF EXISTS update_user_esims_updated_at ON user_esims;
CREATE TRIGGER update_user_esims_updated_at
  BEFORE UPDATE ON user_esims
  FOR EACH ROW EXECUTE FUNCTION update_esim_updated_at();

-- =====================================================
-- Insert sample regions
-- =====================================================
INSERT INTO esim_regions (name, slug, description, flag_emoji, display_order, is_featured)
VALUES
  ('Europe', 'europe', 'Coverage across European countries', NULL, 1, true),
  ('North America', 'north-america', 'USA, Canada, and Mexico', NULL, 2, true),
  ('Asia Pacific', 'asia-pacific', 'Coverage across Asian countries', NULL, 3, true),
  ('Middle East', 'middle-east', 'Gulf and Middle Eastern countries', NULL, 4, false),
  ('Africa', 'africa', 'Coverage across African countries', NULL, 5, false),
  ('South America', 'south-america', 'Coverage across South American countries', NULL, 6, false),
  ('Global', 'global', 'Worldwide coverage', NULL, 0, true)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- Comments for documentation
-- =====================================================
COMMENT ON TABLE esim_providers IS 'API providers for eSIM provisioning (Airalo, eSIM Go, etc.)';
COMMENT ON TABLE esim_inventory IS 'Pre-purchased bulk eSIMs for higher-margin sales';
COMMENT ON TABLE user_esims IS 'eSIMs purchased by users (from API or bulk inventory)';
COMMENT ON COLUMN user_esims.source_type IS 'Whether provisioned from api or bulk inventory';
COMMENT ON COLUMN esim_providers.priority IS 'Lower number = higher priority. Used for fallback ordering.';
