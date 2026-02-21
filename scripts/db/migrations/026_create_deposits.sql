-- Create deposits table for tracking wallet deposits
CREATE TABLE IF NOT EXISTS deposits (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,

  -- Amount
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',

  -- Payment method: STRIPE, PAYSTACK, PAYPAL, BANK_TRANSFER, CRYPTO
  payment_method VARCHAR(50) NOT NULL,

  -- Status: PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED, EXPIRED
  status VARCHAR(20) DEFAULT 'PENDING',

  -- Payment gateway details
  payment_gateway VARCHAR(50),
  gateway_txn_id VARCHAR(255),
  gateway_response JSONB,

  -- Bank transfer specific
  bank_reference VARCHAR(100),
  bank_proof_url TEXT,

  -- Crypto specific
  crypto_network VARCHAR(20),
  crypto_address VARCHAR(255),
  crypto_tx_hash VARCHAR(255),
  crypto_amount DECIMAL(20, 8),

  -- Stripe specific
  stripe_payment_intent_id VARCHAR(255),
  stripe_client_secret VARCHAR(255),

  -- Paystack specific
  paystack_reference VARCHAR(255),
  paystack_access_code VARCHAR(255),

  -- PayPal specific
  paypal_order_id VARCHAR(255),

  -- Timestamps
  completed_at TIMESTAMP,
  failed_at TIMESTAMP,
  failure_reason TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deposits_user ON deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
CREATE INDEX IF NOT EXISTS idx_deposits_method ON deposits(payment_method);
CREATE INDEX IF NOT EXISTS idx_deposits_created ON deposits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deposits_stripe_intent ON deposits(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_deposits_paystack_ref ON deposits(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_deposits_paypal_order ON deposits(paypal_order_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_deposits_updated_at ON deposits;
CREATE TRIGGER update_deposits_updated_at
  BEFORE UPDATE ON deposits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
