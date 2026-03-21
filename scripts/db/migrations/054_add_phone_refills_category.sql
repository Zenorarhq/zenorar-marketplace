INSERT INTO categories (name, slug, description, display_order, is_active)
VALUES ('Phone Refills', 'phone-refills', 'Mobile airtime and data top-ups', 6, true)
ON CONFLICT (slug) DO NOTHING;
