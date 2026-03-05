-- Add metadata and product_type columns to order_items for virtual numbers, eSIMs, gift cards
-- These fields are needed for fulfillment to provision the correct products

-- Add metadata column for storing product-specific data (phone number, plan ID, etc.)
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add product_type column to identify the type of product for fulfillment routing
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS product_type VARCHAR(50);

-- Create index on product_type for faster fulfillment queries
CREATE INDEX IF NOT EXISTS idx_order_items_product_type ON order_items(product_type);

-- Comment on columns
COMMENT ON COLUMN order_items.metadata IS 'Product-specific metadata for fulfillment (phone number, plan ID, country ID, etc.)';
COMMENT ON COLUMN order_items.product_type IS 'Type of product for fulfillment routing (virtual_number, esim, gift_card, digital, etc.)';
