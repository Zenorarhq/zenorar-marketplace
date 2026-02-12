-- Add staff pick column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_staff_pick BOOLEAN DEFAULT FALSE;
