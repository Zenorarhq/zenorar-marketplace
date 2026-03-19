-- Add staff pick column to products table (column is "isStaffPick" — Prisma camelCase)
ALTER TABLE products ADD COLUMN IF NOT EXISTS "isStaffPick" BOOLEAN DEFAULT FALSE;
-- Drop orphaned snake_case column if it exists from old migrations
ALTER TABLE products DROP COLUMN IF EXISTS is_staff_pick;
