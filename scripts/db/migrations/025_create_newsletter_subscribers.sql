-- Newsletter subscribers table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
