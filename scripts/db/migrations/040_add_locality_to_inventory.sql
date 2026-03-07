-- Add locality and region columns to virtual_number_inventory
-- These store the city/area and state/region from the provider

ALTER TABLE virtual_number_inventory
ADD COLUMN IF NOT EXISTS locality VARCHAR(100);

ALTER TABLE virtual_number_inventory
ADD COLUMN IF NOT EXISTS region VARCHAR(100);

COMMENT ON COLUMN virtual_number_inventory.locality IS 'City or area name from provider (e.g., "San Francisco", "New York")';
COMMENT ON COLUMN virtual_number_inventory.region IS 'State or region name from provider (e.g., "CA", "NY", "California")';
