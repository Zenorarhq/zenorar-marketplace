-- Add connectivity subcategories under eSIM and Virtual Numbers

-- eSIM subcategories (parentId = cmlein6zy000ltuq925ztojya)
INSERT INTO categories (id, name, slug, icon, "parentId", "order", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::TEXT, 'Global Roaming eSIM', 'global-roaming-esim', 'sim-card', 'cmlein6zy000ltuq925ztojya', 1, true, NOW(), NOW()),
  (gen_random_uuid()::TEXT, 'North America eSIM', 'north-america-esim', 'map', 'cmlein6zy000ltuq925ztojya', 2, true, NOW(), NOW()),
  (gen_random_uuid()::TEXT, 'Europe eSIM', 'europe-esim', 'compass', 'cmlein6zy000ltuq925ztojya', 3, true, NOW(), NOW()),
  (gen_random_uuid()::TEXT, 'Asia eSIM', 'asia-esim', 'globe', 'cmlein6zy000ltuq925ztojya', 4, true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- Virtual Numbers subcategories (parentId = cmlein7el000ntuq9hc4pj097)
INSERT INTO categories (id, name, slug, icon, "parentId", "order", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::TEXT, 'USA Virtual Number', 'usa-virtual-number', 'call', 'cmlein7el000ntuq9hc4pj097', 1, true, NOW(), NOW()),
  (gen_random_uuid()::TEXT, 'UK Virtual Number', 'uk-virtual-number', 'call', 'cmlein7el000ntuq9hc4pj097', 2, true, NOW(), NOW()),
  (gen_random_uuid()::TEXT, 'Canada Virtual Number', 'canada-virtual-number', 'call', 'cmlein7el000ntuq9hc4pj097', 3, true, NOW(), NOW()),
  (gen_random_uuid()::TEXT, 'Toll-Free Numbers', 'toll-free-numbers', 'phone', 'cmlein7el000ntuq9hc4pj097', 4, true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;
