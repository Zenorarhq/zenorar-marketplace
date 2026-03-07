-- Make productId nullable for dynamic products (virtual numbers, eSIMs, gift cards)
-- These products don't have a catalog entry but are created on-demand

-- First, drop the foreign key constraint
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS "order_items_productId_fkey";

-- Make productId nullable
ALTER TABLE order_items ALTER COLUMN "productId" DROP NOT NULL;

-- Re-add the foreign key constraint with ON DELETE SET NULL
ALTER TABLE order_items
ADD CONSTRAINT "order_items_productId_fkey"
FOREIGN KEY ("productId") REFERENCES products(id) ON DELETE SET NULL;

-- Comment explaining the change
COMMENT ON COLUMN order_items."productId" IS 'Product ID - nullable for dynamic products like virtual numbers and eSIMs';
