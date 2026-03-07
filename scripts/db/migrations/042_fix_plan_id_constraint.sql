-- Fix plan_id constraint for dynamic plans (basic/business with variable durations)
-- The original schema required plan_id to be a UUID referencing virtual_number_plans
-- But the new plan structure uses dynamic plans that aren't in the plans table

-- 1. Drop the foreign key constraint on plan_id
ALTER TABLE user_virtual_numbers
DROP CONSTRAINT IF EXISTS user_virtual_numbers_plan_id_fkey;

-- 2. Change plan_id from UUID to TEXT to store plan category (basic/business)
ALTER TABLE user_virtual_numbers
ALTER COLUMN plan_id DROP NOT NULL;

ALTER TABLE user_virtual_numbers
ALTER COLUMN plan_id TYPE TEXT USING plan_id::TEXT;

-- 3. Add columns for the actual plan details
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

-- 4. Update existing records to have plan_category based on plan_id
UPDATE user_virtual_numbers
SET plan_category = CASE
  WHEN plan_id IS NULL THEN 'basic'
  WHEN plan_id ILIKE '%business%' OR plan_id ILIKE '%pro%' THEN 'business'
  ELSE 'basic'
END
WHERE plan_category IS NULL;

COMMENT ON COLUMN user_virtual_numbers.plan_id IS 'Legacy plan reference or dynamic plan name (basic/business)';
COMMENT ON COLUMN user_virtual_numbers.plan_category IS 'Plan category: basic (SMS only) or business (SMS + calls)';
COMMENT ON COLUMN user_virtual_numbers.plan_duration_days IS 'Plan duration in days (1, 7, 30)';
COMMENT ON COLUMN user_virtual_numbers.sms_limit IS 'SMS limit for the plan period';
COMMENT ON COLUMN user_virtual_numbers.minute_tier IS 'Call minute tier (basic_30, standard_60, pro_120)';
COMMENT ON COLUMN user_virtual_numbers.minute_included IS 'Call minutes included in the plan';
