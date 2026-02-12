-- Add discountCode column to orders table (camelCase to match existing convention)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "discountCode" VARCHAR(50);

-- Create index for discount code lookups
CREATE INDEX IF NOT EXISTS idx_orders_discount_code ON orders("discountCode");
