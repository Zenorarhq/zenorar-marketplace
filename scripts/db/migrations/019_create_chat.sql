-- Chat settings (online/offline toggle)
CREATE TABLE IF NOT EXISTS chat_settings (
  id SERIAL PRIMARY KEY,
  is_online BOOLEAN DEFAULT TRUE,
  offline_message TEXT DEFAULT 'We''re currently offline. We''ll reach out via email when we''re back, or you can create a support ticket.',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default settings row
INSERT INTO chat_settings (is_online) VALUES (TRUE) ON CONFLICT DO NOTHING;

-- Chat conversations
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  guest_email VARCHAR(255),
  guest_name VARCHAR(255),
  session_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ASSIGNED', 'RESOLVED', 'CLOSED')),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('USER', 'AGENT', 'SYSTEM')),
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_conv_session ON chat_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_conv_status ON chat_conversations(status);
CREATE INDEX IF NOT EXISTS idx_chat_conv_assigned ON chat_conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_chat_conv_created ON chat_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_conv_updated ON chat_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_msg_conv ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_msg_created ON chat_messages(created_at);

-- Auto-update updated_at on chat_conversations
CREATE TRIGGER update_chat_conversations_updated_at
  BEFORE UPDATE ON chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
