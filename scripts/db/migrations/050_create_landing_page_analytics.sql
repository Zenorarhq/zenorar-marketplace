-- Landing page analytics events table
-- Tracks page views, button clicks, signups, add-to-cart, and purchases
-- attributed to specific landing pages

CREATE TABLE IF NOT EXISTS landing_page_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES cms_pages(id) ON DELETE CASCADE,
  event_type VARCHAR(30) NOT NULL,
  visitor_id VARCHAR(64),
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(64),
  referrer TEXT,
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  utm_content VARCHAR(255),
  utm_term VARCHAR(255),
  device_type VARCHAR(20),
  user_agent TEXT,
  button_text VARCHAR(255),
  button_url TEXT,
  revenue DECIMAL(10,2),
  order_id TEXT,
  metadata JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lp_events_page_type_date ON landing_page_events (page_id, event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_lp_events_visitor_page ON landing_page_events (visitor_id, page_id);
CREATE INDEX IF NOT EXISTS idx_lp_events_created ON landing_page_events (created_at);
