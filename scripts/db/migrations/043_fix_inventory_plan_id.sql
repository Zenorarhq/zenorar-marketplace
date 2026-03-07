-- Fix rental_plan_id constraint in virtual_number_inventory table
-- Same issue as 042 - dynamic plans use TEXT (basic/business) not UUID

-- 1. Drop the foreign key constraint on rental_plan_id
ALTER TABLE virtual_number_inventory
DROP CONSTRAINT IF EXISTS virtual_number_inventory_rental_plan_id_fkey;

-- 2. Change rental_plan_id from UUID to TEXT
ALTER TABLE virtual_number_inventory
ALTER COLUMN rental_plan_id TYPE TEXT USING rental_plan_id::TEXT;

-- 3. Also fix the rental_history table's plan_id
ALTER TABLE virtual_number_rental_history
DROP CONSTRAINT IF EXISTS virtual_number_rental_history_plan_id_fkey;

ALTER TABLE virtual_number_rental_history
ALTER COLUMN plan_id TYPE TEXT USING plan_id::TEXT;

COMMENT ON COLUMN virtual_number_inventory.rental_plan_id IS 'Plan reference: UUID for legacy plans or TEXT for dynamic plans (basic/business)';
COMMENT ON COLUMN virtual_number_rental_history.plan_id IS 'Plan reference: UUID for legacy plans or TEXT for dynamic plans (basic/business)';
