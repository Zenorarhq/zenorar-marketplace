INSERT INTO categories (id, name, slug, description, "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'Phone Refills', 'phone-refills', 'Mobile airtime and data top-ups', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;
