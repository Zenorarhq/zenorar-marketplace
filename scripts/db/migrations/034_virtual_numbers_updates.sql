-- Virtual Numbers Updates
-- Migration 034: Add missing columns for enhanced functionality

-- Add error_message column to virtual_number_messages for failed sends
ALTER TABLE virtual_number_messages
  ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add price column to plans (alias for base_price for clarity)
ALTER TABLE virtual_number_plans
  ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) GENERATED ALWAYS AS (base_price) STORED;

-- Index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_vnm_user_created ON virtual_number_messages(user_id, created_at DESC);

-- Index for faster call lookups
CREATE INDEX IF NOT EXISTS idx_vnc_user_created ON virtual_number_calls(user_id, created_at DESC);

-- Index for expired number lookups
CREATE INDEX IF NOT EXISTS idx_uvn_status_expires ON user_virtual_numbers(status, expires_at)
  WHERE status = 'active';
