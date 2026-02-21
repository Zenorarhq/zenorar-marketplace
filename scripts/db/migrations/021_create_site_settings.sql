-- Create site_settings table for storing all site configuration
-- Note: This table was originally created by Prisma, hence camelCase column names
CREATE TABLE IF NOT EXISTS site_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key VARCHAR NOT NULL,
  value TEXT,
  "group" VARCHAR,
  "isPublic" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Unique constraint on key (required for ON CONFLICT (key) upserts)
CREATE UNIQUE INDEX IF NOT EXISTS site_settings_key_unique ON site_settings(key);
