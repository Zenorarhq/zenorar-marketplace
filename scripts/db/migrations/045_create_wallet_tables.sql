-- Create user_wallets table for tracking wallet balances
CREATE TABLE IF NOT EXISTS user_wallets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Balance
  balance DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',

  -- Status
  is_frozen BOOLEAN DEFAULT false,
  frozen_at TIMESTAMP,
  frozen_reason TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create wallet_transactions table for tracking all wallet movements
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Transaction details
  type VARCHAR(20) NOT NULL CHECK (type IN ('CREDIT', 'DEBIT', 'REFUND', 'ADJUSTMENT')),
  amount DECIMAL(12, 2) NOT NULL,
  balance_before DECIMAL(12, 2) NOT NULL,
  balance_after DECIMAL(12, 2) NOT NULL,
  description TEXT,

  -- Reference to source (order, deposit, otp_number, etc.)
  reference_type VARCHAR(50),
  reference_id TEXT,

  -- Metadata
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for user_wallets
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_balance ON user_wallets(balance);
CREATE INDEX IF NOT EXISTS idx_user_wallets_frozen ON user_wallets(is_frozen);

-- Indexes for wallet_transactions
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created ON wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference ON wallet_transactions(reference_type, reference_id);

-- Trigger for updated_at on user_wallets
DROP TRIGGER IF EXISTS update_user_wallets_updated_at ON user_wallets;
CREATE TRIGGER update_user_wallets_updated_at
  BEFORE UPDATE ON user_wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create a wallet for all existing users who don't have one
INSERT INTO user_wallets (user_id, balance)
SELECT id, 0.00
FROM users
WHERE id NOT IN (SELECT user_id FROM user_wallets)
ON CONFLICT (user_id) DO NOTHING;
