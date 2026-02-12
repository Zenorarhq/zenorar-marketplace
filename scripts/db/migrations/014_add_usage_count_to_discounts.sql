-- Add usageCount column to discounts table (Prisma camelCase naming)
ALTER TABLE discounts ADD COLUMN IF NOT EXISTS "usageCount" INTEGER DEFAULT 0;

-- Create index for usage tracking queries
CREATE INDEX IF NOT EXISTS idx_discounts_usage ON discounts("usageCount");

-- Update existing records to have usageCount = 0 if null
UPDATE discounts SET "usageCount" = 0 WHERE "usageCount" IS NULL;
