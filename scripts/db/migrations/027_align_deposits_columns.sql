-- Migration 027: Align deposits table columns
-- Adds all missing columns regardless of whether Prisma or migration 026 created the table
-- Uses ADD COLUMN IF NOT EXISTS so it's safe to run on any DB state

-- Columns from migration 026 that may be missing if Prisma created the table first
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS gateway_response JSONB;
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS paypal_order_id VARCHAR(255);
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS paystack_reference VARCHAR(255);
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS paystack_access_code VARCHAR(255);
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255);
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS stripe_client_secret VARCHAR(255);
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS bank_proof_url TEXT;
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS crypto_amount DECIMAL(20, 8);

-- Columns from Prisma schema that may be missing if migration 026 created the table first
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS gateway_metadata JSONB;
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS bank_proof TEXT;

-- Indexes for new columns (IF NOT EXISTS to be safe)
CREATE INDEX IF NOT EXISTS idx_deposits_paystack_ref ON deposits(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_deposits_paypal_order ON deposits(paypal_order_id);
CREATE INDEX IF NOT EXISTS idx_deposits_stripe_intent ON deposits(stripe_payment_intent_id);
