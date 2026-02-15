-- Migration 022: Create Library and Digital Product Access Tables
-- This migration creates tables to support the library feature with digital product delivery

-- 1. Product Files Table - Stores digital product files (scripts, tools, etc.)
CREATE TABLE IF NOT EXISTS product_files (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  version TEXT,
  is_latest BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_files_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_product_files_product_id ON product_files(product_id);
CREATE INDEX IF NOT EXISTS idx_product_files_latest ON product_files(product_id, is_latest) WHERE is_latest = true;

-- 2. User Product Access Table - Tracks user access to purchased products
CREATE TABLE IF NOT EXISTS user_product_access (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  access_type TEXT NOT NULL, -- 'download', 'api_key', 'esim', 'subscription'
  access_key TEXT, -- API key, download token, or eSIM activation code
  expires_at TIMESTAMP,
  downloads_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB, -- Store additional data like QR codes, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_product_access_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_product_access_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_product_access_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT uq_user_product_access UNIQUE (user_id, product_id, access_type)
);

CREATE INDEX IF NOT EXISTS idx_user_product_access_user ON user_product_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_product_access_product ON user_product_access(product_id);
CREATE INDEX IF NOT EXISTS idx_user_product_access_user_product ON user_product_access(user_id, product_id);

-- 3. Download History Table - Track all downloads
CREATE TABLE IF NOT EXISTS download_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  file_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_download_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_download_history_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_download_history_file FOREIGN KEY (file_id) REFERENCES product_files(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_download_history_user ON download_history(user_id);
CREATE INDEX IF NOT EXISTS idx_download_history_product ON download_history(product_id);
CREATE INDEX IF NOT EXISTS idx_download_history_downloaded_at ON download_history(downloaded_at);

-- 4. Add is_digital field to products table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'is_digital'
  ) THEN
    ALTER TABLE products ADD COLUMN is_digital BOOLEAN DEFAULT true;
  END IF;
END $$;

-- 5. Add product_type field to products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'product_type'
  ) THEN
    ALTER TABLE products ADD COLUMN product_type TEXT DEFAULT 'digital';
    -- product_type can be: 'script', 'esim', 'tool', 'api', 'physical'
  END IF;
END $$;

COMMENT ON TABLE product_files IS 'Stores digital product files and their versions';
COMMENT ON TABLE user_product_access IS 'Tracks user access to purchased digital products including API keys, downloads, and subscriptions';
COMMENT ON TABLE download_history IS 'Audit log of all product downloads';
