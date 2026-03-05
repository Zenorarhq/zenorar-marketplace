-- Virtual Number Inventory Pool System
-- Numbers we own on Twilio that can be rented to customers

-- =====================================================
-- 1. Inventory Table - Numbers we own
-- =====================================================
CREATE TABLE IF NOT EXISTS virtual_number_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  phone_number_display VARCHAR(30),
  country_id UUID REFERENCES virtual_number_countries(id),
  number_type VARCHAR(20) DEFAULT 'local',  -- 'local', 'toll-free', 'mobile'

  -- Provider info
  provider VARCHAR(50) DEFAULT 'twilio',
  provider_number_sid VARCHAR(50),

  -- Capabilities
  sms_enabled BOOLEAN DEFAULT true,
  voice_enabled BOOLEAN DEFAULT true,
  mms_enabled BOOLEAN DEFAULT false,

  -- Rental status
  -- 'available' = ready to rent
  -- 'rented' = currently rented to a user
  -- 'hold' = reserved for original user after grace period
  -- 'releasing' = scheduled for release to Twilio
  status VARCHAR(20) DEFAULT 'available',

  -- Current rental info
  rented_to_user_id TEXT REFERENCES users(id),
  rented_at TIMESTAMP,
  rental_expires_at TIMESTAMP,
  rental_plan_id UUID REFERENCES virtual_number_plans(id),

  -- Grace period tracking
  grace_period_ends_at TIMESTAMP,

  -- Hold for original user (24hr after grace ends)
  hold_for_user_id TEXT REFERENCES users(id),
  hold_expires_at TIMESTAMP,

  -- Twilio billing sync
  twilio_cost_monthly DECIMAL(10,2),
  twilio_purchased_at TIMESTAMP,
  twilio_next_billing TIMESTAMP,

  -- Metadata
  times_rented INT DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  last_rented_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_vni_status ON virtual_number_inventory(status);
CREATE INDEX IF NOT EXISTS idx_vni_country ON virtual_number_inventory(country_id);
CREATE INDEX IF NOT EXISTS idx_vni_type ON virtual_number_inventory(number_type);
CREATE INDEX IF NOT EXISTS idx_vni_rental_expires ON virtual_number_inventory(rental_expires_at) WHERE status = 'rented';
CREATE INDEX IF NOT EXISTS idx_vni_grace_expires ON virtual_number_inventory(grace_period_ends_at) WHERE grace_period_ends_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vni_hold_expires ON virtual_number_inventory(hold_expires_at) WHERE status = 'hold';
CREATE INDEX IF NOT EXISTS idx_vni_twilio_billing ON virtual_number_inventory(twilio_next_billing) WHERE status = 'available';
CREATE INDEX IF NOT EXISTS idx_vni_rented_user ON virtual_number_inventory(rented_to_user_id) WHERE status = 'rented';

-- =====================================================
-- 2. Rental History Table - Track all rentals
-- =====================================================
CREATE TABLE IF NOT EXISTS virtual_number_rental_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID REFERENCES virtual_number_inventory(id) ON DELETE SET NULL,
  phone_number VARCHAR(20) NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES virtual_number_plans(id),

  -- Rental period
  rented_at TIMESTAMP NOT NULL,
  expired_at TIMESTAMP,
  renewed BOOLEAN DEFAULT false,

  -- Pricing
  amount_paid DECIMAL(10,2),
  minute_tier VARCHAR(20),  -- 'basic_30', 'standard_60', 'pro_120'
  minute_tier_price DECIMAL(10,2),

  -- Usage stats at end of rental
  sms_sent INT DEFAULT 0,
  sms_received INT DEFAULT 0,
  call_minutes_used INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vnrh_user ON virtual_number_rental_history(user_id);
CREATE INDEX IF NOT EXISTS idx_vnrh_phone ON virtual_number_rental_history(phone_number);
CREATE INDEX IF NOT EXISTS idx_vnrh_dates ON virtual_number_rental_history(rented_at, expired_at);

-- =====================================================
-- 3. Update virtual_number_plans for new structure
-- =====================================================
-- Add category column (basic/business)
ALTER TABLE virtual_number_plans
ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'basic';

-- Add included minutes for business plans
ALTER TABLE virtual_number_plans
ADD COLUMN IF NOT EXISTS call_forwarding_minutes INT DEFAULT 0;

-- Update existing plans with categories
UPDATE virtual_number_plans SET category = 'basic' WHERE slug LIKE '%basic%' OR slug = 'temporary' OR slug = 'weekly';
UPDATE virtual_number_plans SET category = 'business' WHERE slug LIKE '%pro%' OR slug LIKE '%business%';

-- =====================================================
-- 4. Minute Tier Options Table
-- =====================================================
CREATE TABLE IF NOT EXISTS virtual_number_minute_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  minutes INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default minute tiers
INSERT INTO virtual_number_minute_tiers (name, slug, minutes, price, display_order)
VALUES
  ('Basic', 'basic_30', 30, 3.00, 1),
  ('Standard', 'standard_60', 60, 5.00, 2),
  ('Pro', 'pro_120', 120, 10.00, 3)
ON CONFLICT (slug) DO UPDATE SET
  minutes = EXCLUDED.minutes,
  price = EXCLUDED.price;

-- =====================================================
-- 5. Virtual Number Settings
-- =====================================================
-- Add settings for markup and forwarding costs
INSERT INTO site_settings (id, key, value, "group", "isPublic", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'virtualNumberMarkupPercent', '"35"', 'virtual_numbers', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'virtualNumberDailyDivisor', '"30"', 'virtual_numbers', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'callForwardingUsRate', '"0.05"', 'virtual_numbers', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'callForwardingIntlRate', '"0.25"', 'virtual_numbers', false, NOW(), NOW()),
  (gen_random_uuid()::text, 'smsForwardingRate', '"0.02"', 'virtual_numbers', false, NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 6. Expiry Reminders Table
-- =====================================================
CREATE TABLE IF NOT EXISTS virtual_number_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  virtual_number_id UUID REFERENCES user_virtual_numbers(id) ON DELETE CASCADE,
  reminder_type VARCHAR(10) NOT NULL,  -- '48hr', '24hr', '2hr'
  sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(virtual_number_id, reminder_type)
);

CREATE INDEX IF NOT EXISTS idx_vnr_number ON virtual_number_reminders(virtual_number_id);

-- Add inventory_id reference to user_virtual_numbers
ALTER TABLE user_virtual_numbers
ADD COLUMN IF NOT EXISTS inventory_id UUID REFERENCES virtual_number_inventory(id);

-- =====================================================
-- 7. Update triggers
-- =====================================================
CREATE OR REPLACE FUNCTION update_vni_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_virtual_number_inventory_updated_at ON virtual_number_inventory;
CREATE TRIGGER update_virtual_number_inventory_updated_at
  BEFORE UPDATE ON virtual_number_inventory
  FOR EACH ROW EXECUTE FUNCTION update_vni_updated_at();

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE virtual_number_inventory IS 'Phone numbers we own on Twilio, available for rental';
COMMENT ON COLUMN virtual_number_inventory.status IS 'available=ready to rent, rented=in use, hold=reserved for original user, releasing=scheduled for Twilio release';
COMMENT ON COLUMN virtual_number_inventory.grace_period_ends_at IS 'When grace period ends, moves to hold status';
COMMENT ON COLUMN virtual_number_inventory.hold_expires_at IS 'When hold expires, number becomes available to anyone';
COMMENT ON COLUMN virtual_number_inventory.twilio_next_billing IS 'When Twilio will charge for next month - release before this if unused';
COMMENT ON TABLE virtual_number_rental_history IS 'Historical record of all number rentals';
COMMENT ON TABLE virtual_number_minute_tiers IS 'Call forwarding minute packages for business plans';
