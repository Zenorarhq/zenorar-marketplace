-- Add multi-provider support to virtual_number_countries
-- Allows a country to be available from multiple providers (Twilio, Plivo, Vonage)

-- Add providers array column
ALTER TABLE virtual_number_countries
ADD COLUMN IF NOT EXISTS providers TEXT[] DEFAULT ARRAY['twilio'];

-- Migrate existing data from provider to providers array
UPDATE virtual_number_countries
SET providers = ARRAY[provider]
WHERE providers IS NULL OR providers = '{}';

-- Create index for provider lookup
CREATE INDEX IF NOT EXISTS idx_vn_countries_providers ON virtual_number_countries USING GIN(providers);

-- Add comment for documentation
COMMENT ON COLUMN virtual_number_countries.providers IS 'Array of providers that have numbers available in this country (twilio, plivo, vonage)';
