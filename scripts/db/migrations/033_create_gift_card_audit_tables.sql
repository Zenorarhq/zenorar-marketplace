-- Gift Card Audit and Rate Limiting Tables
-- Migration 033: Create audit log and rate limiting infrastructure

-- Audit log for tracking all gift card code access
CREATE TABLE IF NOT EXISTS gift_card_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL, -- code_revealed, code_copied, code_reserved, etc.
  resource_type VARCHAR(50) NOT NULL, -- gift_card_code, user_gift_card
  resource_id UUID NOT NULL,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rate limiting blocks (persisted across restarts)
CREATE TABLE IF NOT EXISTS gift_card_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  action VARCHAR(50) NOT NULL,
  blocked_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, action)
);

-- Rate limit request log (for counting)
CREATE TABLE IF NOT EXISTS gift_card_rate_limit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  action VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add encrypted code column (optional migration for existing data)
ALTER TABLE gift_card_codes
  ADD COLUMN IF NOT EXISTS code_encrypted BOOLEAN DEFAULT false;

ALTER TABLE user_gift_cards
  ADD COLUMN IF NOT EXISTS code_encrypted BOOLEAN DEFAULT false;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_gift_card_audit_log_user_id ON gift_card_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_audit_log_resource ON gift_card_audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_audit_log_action ON gift_card_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_gift_card_audit_log_created_at ON gift_card_audit_log(created_at);

CREATE INDEX IF NOT EXISTS idx_gift_card_rate_limits_user_action ON gift_card_rate_limits(user_id, action);
CREATE INDEX IF NOT EXISTS idx_gift_card_rate_limits_blocked_until ON gift_card_rate_limits(blocked_until);

CREATE INDEX IF NOT EXISTS idx_gift_card_rate_limit_log_user_action ON gift_card_rate_limit_log(user_id, action, created_at);

-- Cleanup function for old rate limit logs
CREATE OR REPLACE FUNCTION cleanup_gift_card_rate_limit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Remove rate limit logs older than 24 hours
  DELETE FROM gift_card_rate_limit_log
  WHERE created_at < NOW() - INTERVAL '24 hours';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Remove expired blocks
  DELETE FROM gift_card_rate_limits
  WHERE blocked_until < NOW();

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add refund tracking columns to gift_card_codes
ALTER TABLE gift_card_codes
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refunded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS refund_reason TEXT;

-- Add retry tracking for API purchases
ALTER TABLE user_gift_cards
  ADD COLUMN IF NOT EXISTS provision_attempts INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_provision_error TEXT,
  ADD COLUMN IF NOT EXISTS needs_retry BOOLEAN DEFAULT false;

-- Gift card alerts table for tracking sent notifications
CREATE TABLE IF NOT EXISTS gift_card_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(50) NOT NULL, -- low_stock, expiring_codes, etc.
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gift_card_alerts_type ON gift_card_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_gift_card_alerts_created_at ON gift_card_alerts(created_at);

-- GDPR support: Add soft delete column for user gift cards
ALTER TABLE user_gift_cards
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Add currency support
ALTER TABLE gift_cards
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

ALTER TABLE gift_card_codes
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

ALTER TABLE user_gift_cards
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';
