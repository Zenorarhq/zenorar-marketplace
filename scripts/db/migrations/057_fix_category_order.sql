-- Set explicit display order for all top-level categories.
-- Previously all had order = 0, causing alphabetical fallback sort.
UPDATE categories SET "order" = CASE slug
  WHEN 'scripts'         THEN 1
  WHEN 'gift-cards'      THEN 2
  WHEN 'esim'            THEN 3
  WHEN 'virtual-numbers' THEN 4
  WHEN 'phone-refills'   THEN 5
  WHEN 'cards'           THEN 6
  ELSE "order"
END
WHERE slug IN ('scripts', 'gift-cards', 'esim', 'virtual-numbers', 'phone-refills', 'cards');
