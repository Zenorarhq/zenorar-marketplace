-- Remove subcategories that serve no functional purpose.
-- Keep only subcategories under 'scripts' (e.g. Banking).
DELETE FROM categories
WHERE "parentId" IS NOT NULL
  AND "parentId" NOT IN (
    SELECT id FROM categories WHERE slug = 'scripts'
  );
