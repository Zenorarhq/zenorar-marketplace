-- Make userId nullable for guest reviews
ALTER TABLE reviews ALTER COLUMN "userId" DROP NOT NULL;

-- Add orderId column (to link guest reviews to orders)
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS "orderId" TEXT;

-- Guest reviewer name (from order shipping address)
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS guest_name VARCHAR(255);

-- Admin reply (one reply per review)
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS admin_reply TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS admin_reply_at TIMESTAMP;

-- Prevent duplicate guest reviews per product per order
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_product_order
  ON reviews ("productId", "orderId") WHERE "orderId" IS NOT NULL;
