-- Create email_settings table for multi-provider email configuration
CREATE TABLE IF NOT EXISTS email_settings (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(50) NOT NULL UNIQUE, -- 'smtp', 'resend', 'sendgrid'
  is_active BOOLEAN DEFAULT false,
  config JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Ensure only one active provider at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_email_provider
ON email_settings(is_active)
WHERE is_active = true;

-- Insert default configurations (all inactive initially)
INSERT INTO email_settings (provider, is_active, config) VALUES
('smtp', false, '{
  "host": "smtp.gmail.com",
  "port": 587,
  "secure": false,
  "user": "",
  "password": "",
  "from": "noreply@zenorar.com"
}'::jsonb),
('resend', false, '{
  "apiKey": "",
  "from": "noreply@zenorar.com"
}'::jsonb),
('sendgrid', false, '{
  "apiKey": "",
  "from": "noreply@zenorar.com"
}'::jsonb)
ON CONFLICT (provider) DO NOTHING;
