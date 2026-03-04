-- eSIM Top-up Plans Table
-- Defines available top-up options for eSIM plans

-- =====================================================
-- 1. eSIM Top-up Plans (Available top-up options)
-- =====================================================
CREATE TABLE IF NOT EXISTS esim_topup_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES esim_plans(id) ON DELETE CASCADE,

  -- Top-up details
  name VARCHAR(255) NOT NULL,                 -- "1GB Data Pack", "5GB Data Pack"
  description TEXT,

  -- Data specs
  data_amount_mb INT NOT NULL,                -- In megabytes (1024 = 1GB)
  validity_days INT NOT NULL DEFAULT 30,      -- How long the top-up is valid

  -- Pricing
  cost_price DECIMAL(10,2) NOT NULL,          -- What we pay
  retail_price DECIMAL(10,2) NOT NULL,        -- What we sell for

  -- Provider mapping (for API top-ups)
  provider_topup_id VARCHAR(100),             -- Provider's top-up identifier

  -- Status
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_esim_topup_plans_plan ON esim_topup_plans(plan_id);
CREATE INDEX IF NOT EXISTS idx_esim_topup_plans_active ON esim_topup_plans(plan_id, is_active) WHERE is_active = true;

-- =====================================================
-- 2. Rename esim_topups to esim_topup_history for clarity
-- =====================================================
-- Note: We keep the existing esim_topups table as history
-- Just add a comment for documentation

COMMENT ON TABLE esim_topups IS 'History of completed top-ups (renamed conceptually to esim_topup_history)';
COMMENT ON TABLE esim_topup_plans IS 'Available top-up options for each eSIM plan';

-- =====================================================
-- 3. Update trigger for updated_at
-- =====================================================
DROP TRIGGER IF EXISTS update_esim_topup_plans_updated_at ON esim_topup_plans;
CREATE TRIGGER update_esim_topup_plans_updated_at
  BEFORE UPDATE ON esim_topup_plans
  FOR EACH ROW EXECUTE FUNCTION update_esim_updated_at();

-- =====================================================
-- 4. Insert sample top-up plans (for testing)
-- =====================================================
-- This will be populated by admin or synced from providers

-- Example: Insert top-ups for plans that support it (run after seeding plans)
-- INSERT INTO esim_topup_plans (plan_id, name, data_amount_mb, validity_days, cost_price, retail_price)
-- SELECT id, '1GB Top-up', 1024, 30, 3.00, 5.99
-- FROM esim_plans WHERE supports_topup = true;
