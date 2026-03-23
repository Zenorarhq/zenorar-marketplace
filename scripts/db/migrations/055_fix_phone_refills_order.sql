INSERT INTO categories (id, name, slug, description, icon, "order", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'Phone Refills', 'phone-refills', 'Mobile airtime and data top-ups', 'phone', 6, true, NOW(), NOW())
ON CONFLICT (slug) DO UPDATE SET
  "order" = 6,
  icon = 'phone';
