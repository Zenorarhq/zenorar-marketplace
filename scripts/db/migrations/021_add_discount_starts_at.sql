-- Add startsAt column to discounts table (start date scheduling)
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS "startsAt" TIMESTAMP;
