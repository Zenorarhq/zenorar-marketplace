-- Create login_attempts table for tracking failed login attempts
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  success BOOLEAN DEFAULT FALSE,
  attempted_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_time ON login_attempts(attempted_at);

-- Add passwordChangedAt column to users table (Prisma camelCase)
ALTER TABLE users ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP DEFAULT NOW();
-- Drop orphaned snake_case column if it exists from old migrations
ALTER TABLE users DROP COLUMN IF EXISTS password_changed_at;
