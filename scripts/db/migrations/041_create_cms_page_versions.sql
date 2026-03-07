-- Create CMS page versions table
CREATE TABLE IF NOT EXISTS cms_page_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES cms_pages(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  content JSONB NOT NULL DEFAULT '[]',
  author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_page_versions_page_id ON cms_page_versions(page_id);
CREATE INDEX IF NOT EXISTS idx_cms_page_versions_version ON cms_page_versions(page_id, version DESC);