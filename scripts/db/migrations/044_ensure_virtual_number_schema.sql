-- Ensure all virtual number schema changes are in place
-- This migration is idempotent and can be run multiple times safely

-- 1. Fix user_virtual_numbers.plan_id: Drop FK constraint and change to TEXT
ALTER TABLE user_virtual_numbers
DROP CONSTRAINT IF EXISTS user_virtual_numbers_plan_id_fkey;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_virtual_numbers'
    AND column_name = 'plan_id'
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE user_virtual_numbers ALTER COLUMN plan_id TYPE TEXT USING plan_id::TEXT;
  END IF;
END $$;

ALTER TABLE user_virtual_numbers ALTER COLUMN plan_id DROP NOT NULL;

-- 2. Add required columns to user_virtual_numbers
ALTER TABLE user_virtual_numbers
ADD COLUMN IF NOT EXISTS plan_category VARCHAR(20) DEFAULT 'basic';

ALTER TABLE user_virtual_numbers
ADD COLUMN IF NOT EXISTS plan_duration_days INT DEFAULT 30;

ALTER TABLE user_virtual_numbers
ADD COLUMN IF NOT EXISTS sms_limit INT DEFAULT 100;

ALTER TABLE user_virtual_numbers
ADD COLUMN IF NOT EXISTS minute_tier VARCHAR(20);

ALTER TABLE user_virtual_numbers
ADD COLUMN IF NOT EXISTS minute_included INT DEFAULT 0;

ALTER TABLE user_virtual_numbers
ADD COLUMN IF NOT EXISTS inventory_id UUID REFERENCES virtual_number_inventory(id);

-- 3. Fix virtual_number_inventory.rental_plan_id: Drop FK and change to TEXT
ALTER TABLE virtual_number_inventory
DROP CONSTRAINT IF EXISTS virtual_number_inventory_rental_plan_id_fkey;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'virtual_number_inventory'
    AND column_name = 'rental_plan_id'
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE virtual_number_inventory ALTER COLUMN rental_plan_id TYPE TEXT USING rental_plan_id::TEXT;
  END IF;
END $$;

-- 4. Fix virtual_number_rental_history.plan_id: Drop FK and change to TEXT
ALTER TABLE virtual_number_rental_history
DROP CONSTRAINT IF EXISTS virtual_number_rental_history_plan_id_fkey;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'virtual_number_rental_history'
    AND column_name = 'plan_id'
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE virtual_number_rental_history ALTER COLUMN plan_id TYPE TEXT USING plan_id::TEXT;
  END IF;
END $$;

-- 5. Add missing columns to virtual_number_inventory
ALTER TABLE virtual_number_inventory
ADD COLUMN IF NOT EXISTS locality VARCHAR(100);

ALTER TABLE virtual_number_inventory
ADD COLUMN IF NOT EXISTS region VARCHAR(100);

-- 6. Update comments
COMMENT ON COLUMN user_virtual_numbers.plan_id IS 'Plan reference: UUID for legacy plans or TEXT for dynamic plans (basic/business)';
COMMENT ON COLUMN user_virtual_numbers.plan_category IS 'Plan category: basic (SMS only) or business (SMS + calls)';
COMMENT ON COLUMN user_virtual_numbers.plan_duration_days IS 'Plan duration in days (1, 7, 30)';
COMMENT ON COLUMN user_virtual_numbers.sms_limit IS 'SMS limit for the plan period';
COMMENT ON COLUMN user_virtual_numbers.minute_tier IS 'Call minute tier (basic_30, standard_60, pro_120)';
COMMENT ON COLUMN user_virtual_numbers.minute_included IS 'Call minutes included in the plan';
COMMENT ON COLUMN virtual_number_inventory.rental_plan_id IS 'Plan reference: UUID for legacy plans or TEXT for dynamic plans (basic/business)';
COMMENT ON COLUMN virtual_number_rental_history.plan_id IS 'Plan reference: UUID for legacy plans or TEXT for dynamic plans (basic/business)';
