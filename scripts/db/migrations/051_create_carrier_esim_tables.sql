-- =====================================================
-- Migration 051: Carrier eSIM Plans & Orders
-- Manually-fulfilled carrier-based eSIMs (AT&T, T-Mobile, etc.)
-- =====================================================

-- 1. Carrier eSIM Plans (the catalog)
CREATE TABLE IF NOT EXISTS carrier_esim_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_name VARCHAR(100) NOT NULL,
  carrier_slug VARCHAR(100) NOT NULL,
  plan_name VARCHAR(255) NOT NULL,
  description TEXT,
  country VARCHAR(2) NOT NULL DEFAULT 'US',
  data_amount_gb DECIMAL(10,2),
  data_amount_display VARCHAR(50) NOT NULL,
  is_unlimited BOOLEAN DEFAULT false,
  voice_minutes INT DEFAULT 0,
  voice_display VARCHAR(50) DEFAULT 'Unlimited',
  sms_count INT DEFAULT 0,
  sms_display VARCHAR(50) DEFAULT 'Unlimited',
  network_type VARCHAR(20) DEFAULT '4g',
  cost_price DECIMAL(10,2) NOT NULL,
  retail_price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_carrier_plans_active ON carrier_esim_plans(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_carrier_plans_carrier ON carrier_esim_plans(carrier_slug);
CREATE INDEX IF NOT EXISTS idx_carrier_plans_country ON carrier_esim_plans(country);

-- 2. Carrier eSIM Orders (manual fulfillment tracking)
CREATE TABLE IF NOT EXISTS carrier_esim_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL REFERENCES orders(id),
  order_item_id TEXT,
  carrier_plan_id UUID NOT NULL REFERENCES carrier_esim_plans(id),

  status VARCHAR(30) NOT NULL DEFAULT 'pending_fulfillment',
  -- Values: 'pending_fulfillment', 'fulfilled', 'cancelled', 'refunded'

  -- Customer info collected at purchase
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  device_imei VARCHAR(20),
  device_eid VARCHAR(40),
  device_model VARCHAR(100),
  billing_address JSONB,
  special_instructions TEXT,

  -- 24-hour fulfillment window
  fulfillment_deadline TIMESTAMP NOT NULL,

  -- Admin fulfillment fields
  fulfilled_at TIMESTAMP,
  fulfilled_by TEXT REFERENCES users(id),
  iccid VARCHAR(30),
  smdp_address VARCHAR(255),
  qr_code_data TEXT,
  activation_code VARCHAR(255),
  admin_notes TEXT,

  -- Cancellation
  cancellation_reason TEXT,
  cancelled_at TIMESTAMP,
  refunded_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_carrier_orders_user ON carrier_esim_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_carrier_orders_status ON carrier_esim_orders(status);
CREATE INDEX IF NOT EXISTS idx_carrier_orders_deadline ON carrier_esim_orders(fulfillment_deadline)
  WHERE status = 'pending_fulfillment';
CREATE INDEX IF NOT EXISTS idx_carrier_orders_order ON carrier_esim_orders(order_id);

-- 3. Alter user_esims to support carrier eSIMs (nullable plan_id + new columns)
ALTER TABLE user_esims ALTER COLUMN plan_id DROP NOT NULL;
ALTER TABLE user_esims ADD COLUMN IF NOT EXISTS carrier_plan_id UUID REFERENCES carrier_esim_plans(id);
ALTER TABLE user_esims ADD COLUMN IF NOT EXISTS carrier_order_id UUID REFERENCES carrier_esim_orders(id);

-- 4. Updated_at triggers
CREATE OR REPLACE FUNCTION update_carrier_esim_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_carrier_esim_plans_updated ON carrier_esim_plans;
CREATE TRIGGER trg_carrier_esim_plans_updated
  BEFORE UPDATE ON carrier_esim_plans
  FOR EACH ROW EXECUTE FUNCTION update_carrier_esim_updated_at();

DROP TRIGGER IF EXISTS trg_carrier_esim_orders_updated ON carrier_esim_orders;
CREATE TRIGGER trg_carrier_esim_orders_updated
  BEFORE UPDATE ON carrier_esim_orders
  FOR EACH ROW EXECUTE FUNCTION update_carrier_esim_updated_at();
