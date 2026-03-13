-- Add Cards category for virtual and instant cards
INSERT INTO categories (id, name, slug, description, icon, "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'Cards', 'cards', 'Virtual and instant cards for online payments', 'credit-card', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;
