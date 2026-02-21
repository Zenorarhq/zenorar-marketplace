-- Create pending_crypto_payments table for blockchain verification tracking
-- Note: Uses TEXT for IDs to match existing database schema
CREATE TABLE IF NOT EXISTS pending_crypto_payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
  order_number VARCHAR(50) NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),

  -- Payment details
  network VARCHAR(20) NOT NULL CHECK (network IN ('BTC', 'ETH', 'USDT_ERC20', 'USDT_BEP20', 'USDT_TRC20', 'BNB', 'USDC', 'SOL', 'TRON')),
  receiving_address VARCHAR(255) NOT NULL,
  expected_amount DECIMAL(20, 8) NOT NULL,
  usd_amount DECIMAL(10, 2) NOT NULL,
  tolerance_percent DECIMAL(5, 2) DEFAULT 2.0,

  -- User-provided transaction hash (optional, for faster verification)
  user_tx_hash VARCHAR(255),

  -- Verification status
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'EXPIRED', 'FAILED', 'MANUALLY_CONFIRMED')),
  tx_hash VARCHAR(255),
  confirmed_amount DECIMAL(20, 8),
  confirmations INTEGER DEFAULT 0,

  -- Timing
  initiated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  confirmed_at TIMESTAMP,
  last_checked_at TIMESTAMP,

  -- Admin notes for manual verification
  admin_note TEXT,
  confirmed_by TEXT REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_pending_crypto_order ON pending_crypto_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_pending_crypto_order_number ON pending_crypto_payments(order_number);
CREATE INDEX IF NOT EXISTS idx_pending_crypto_status ON pending_crypto_payments(status);
CREATE INDEX IF NOT EXISTS idx_pending_crypto_network ON pending_crypto_payments(network);
CREATE INDEX IF NOT EXISTS idx_pending_crypto_expires ON pending_crypto_payments(expires_at);
CREATE INDEX IF NOT EXISTS idx_pending_crypto_address ON pending_crypto_payments(receiving_address);
CREATE INDEX IF NOT EXISTS idx_pending_crypto_user_tx ON pending_crypto_payments(user_tx_hash);
CREATE INDEX IF NOT EXISTS idx_pending_crypto_created ON pending_crypto_payments(created_at DESC);

-- Create trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_pending_crypto_payments_updated_at ON pending_crypto_payments;
CREATE TRIGGER update_pending_crypto_payments_updated_at
  BEFORE UPDATE ON pending_crypto_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
