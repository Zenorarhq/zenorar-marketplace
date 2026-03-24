-- Migration 059: Remove mock products that don't belong to the 'scripts' category
--
-- The products table is only for Scripts. Mock seed data incorrectly inserted
-- eSIM, Gift Card, and Virtual Number products into this table.
-- Those categories have their own dedicated tables (esim_plans, gift_cards, etc.)

-- Safe: only deletes products explicitly assigned to a non-scripts category.
-- Products with no categoryId (NULL) are NOT touched by this query.
DELETE FROM products
WHERE "categoryId" IN (
  SELECT id FROM categories WHERE slug != 'scripts'
);
