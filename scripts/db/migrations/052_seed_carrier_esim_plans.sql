-- =====================================================
-- Migration 052: Seed Carrier eSIM Plans
-- Real carrier plans with cost_price + retail markup
-- =====================================================

INSERT INTO carrier_esim_plans (carrier_name, carrier_slug, plan_name, description, country, data_amount_gb, data_amount_display, is_unlimited, voice_minutes, voice_display, sms_count, sms_display, network_type, cost_price, retail_price, is_active, is_featured, display_order)
VALUES
  -- AT&T (US)
  ('AT&T', 'att', 'Prepaid 5GB', '5GB high-speed data with unlimited talk & text on AT&T network', 'US', 5, '5GB', false, 0, 'Unlimited', 0, 'Unlimited', '4g', 25.00, 35.99, true, false, 1),
  ('AT&T', 'att', 'Prepaid 15GB', '15GB high-speed data with unlimited talk & text on AT&T network', 'US', 15, '15GB', false, 0, 'Unlimited', 0, 'Unlimited', '4g', 35.00, 49.99, true, true, 2),
  ('AT&T', 'att', 'Unlimited', 'Unlimited data, talk & text with 5G access on AT&T', 'US', NULL, 'Unlimited', true, 0, 'Unlimited', 0, 'Unlimited', '5g', 55.00, 79.99, true, false, 3),

  -- T-Mobile (US)
  ('T-Mobile', 't-mobile', 'Essentials', 'Unlimited talk, text & data with T-Mobile Essentials', 'US', NULL, 'Unlimited', true, 0, 'Unlimited', 0, 'Unlimited', '5g', 50.00, 70.99, true, false, 10),
  ('T-Mobile', 't-mobile', 'Magenta', 'Unlimited premium data with 5GB hotspot on T-Mobile', 'US', NULL, 'Unlimited', true, 0, 'Unlimited', 0, 'Unlimited', '5g', 60.00, 80.99, true, true, 11),
  ('T-Mobile', 't-mobile', 'Magenta MAX', 'Unlimited premium data with 40GB hotspot & Netflix on T-Mobile', 'US', NULL, 'Unlimited', true, 0, 'Unlimited', 0, 'Unlimited', '5g', 70.00, 95.99, true, false, 12),

  -- Verizon (US)
  ('Verizon', 'verizon', 'Welcome 5GB', '5GB data with unlimited talk & text on Verizon', 'US', 5, '5GB', false, 0, 'Unlimited', 0, 'Unlimited', '4g', 25.00, 35.99, true, false, 20),
  ('Verizon', 'verizon', 'Plus Unlimited', 'Unlimited data with 5G access on Verizon', 'US', NULL, 'Unlimited', true, 0, 'Unlimited', 0, 'Unlimited', '5g', 40.00, 55.99, true, true, 21),
  ('Verizon', 'verizon', 'Ultimate', 'Unlimited premium data with 60GB hotspot on Verizon', 'US', NULL, 'Unlimited', true, 0, 'Unlimited', 0, 'Unlimited', '5g', 50.00, 65.99, true, false, 22),

  -- Mint Mobile (US)
  ('Mint Mobile', 'mint-mobile', '5GB Plan', '5GB data with unlimited talk & text - Mint Mobile', 'US', 5, '5GB', false, 0, 'Unlimited', 0, 'Unlimited', '5g', 12.00, 19.99, true, false, 30),
  ('Mint Mobile', 'mint-mobile', '15GB Plan', '15GB data with unlimited talk & text - Mint Mobile', 'US', 15, '15GB', false, 0, 'Unlimited', 0, 'Unlimited', '5g', 17.00, 24.99, true, true, 31),
  ('Mint Mobile', 'mint-mobile', '20GB Plan', '20GB data with unlimited talk & text - Mint Mobile', 'US', 20, '20GB', false, 0, 'Unlimited', 0, 'Unlimited', '5g', 20.00, 29.99, true, false, 32),
  ('Mint Mobile', 'mint-mobile', 'Unlimited', 'Unlimited data with unlimited talk & text - Mint Mobile', 'US', NULL, 'Unlimited', true, 0, 'Unlimited', 0, 'Unlimited', '5g', 25.00, 35.99, true, false, 33),

  -- Visible (US)
  ('Visible', 'visible', 'Basic', 'Unlimited data, talk & text on Verizon network - Visible', 'US', NULL, 'Unlimited', true, 0, 'Unlimited', 0, 'Unlimited', '5g', 20.00, 30.99, true, false, 40),
  ('Visible', 'visible', 'Plus', 'Unlimited premium data with 50GB hotspot - Visible+', 'US', NULL, 'Unlimited', true, 0, 'Unlimited', 0, 'Unlimited', '5g', 35.00, 50.99, true, false, 41),

  -- Google Fi (US)
  ('Google Fi', 'google-fi', 'Simply Unlimited', 'Unlimited data with 35GB high-speed on Google Fi', 'US', NULL, 'Unlimited', true, 0, 'Unlimited', 0, 'Unlimited', '5g', 40.00, 55.99, true, false, 50),
  ('Google Fi', 'google-fi', 'Unlimited Plus', 'Unlimited data with 50GB high-speed & 100GB hotspot - Google Fi', 'US', NULL, 'Unlimited', true, 0, 'Unlimited', 0, 'Unlimited', '5g', 50.00, 70.99, true, false, 51),

  -- Cricket (US)
  ('Cricket', 'cricket', '5GB Plan', '5GB data with unlimited talk & text on AT&T network - Cricket', 'US', 5, '5GB', false, 0, 'Unlimited', 0, 'Unlimited', '4g', 25.00, 35.99, true, false, 60),
  ('Cricket', 'cricket', '10GB Plan', '10GB data with unlimited talk & text - Cricket', 'US', 10, '10GB', false, 0, 'Unlimited', 0, 'Unlimited', '4g', 32.00, 45.99, true, false, 61),
  ('Cricket', 'cricket', 'Unlimited', 'Unlimited data with unlimited talk & text - Cricket', 'US', NULL, 'Unlimited', true, 0, 'Unlimited', 0, 'Unlimited', '5g', 45.00, 60.99, true, false, 62),

  -- Vodafone (UK)
  ('Vodafone', 'vodafone', 'PAYG 10GB', '10GB data with unlimited calls & texts - Vodafone UK', 'GB', 10, '10GB', false, 0, 'Unlimited', 0, 'Unlimited', '4g', 16.00, 24.99, true, false, 70),
  ('Vodafone', 'vodafone', 'PAYG 30GB', '30GB data with unlimited calls & texts - Vodafone UK', 'GB', 30, '30GB', false, 0, 'Unlimited', 0, 'Unlimited', '5g', 22.00, 34.99, true, true, 71),

  -- EE (UK)
  ('EE', 'ee', '10GB Plan', '10GB data with unlimited calls & texts - EE UK', 'GB', 10, '10GB', false, 0, 'Unlimited', 0, 'Unlimited', '4g', 18.00, 29.99, true, false, 80),
  ('EE', 'ee', '25GB Plan', '25GB data with unlimited calls & texts - EE UK', 'GB', 25, '25GB', false, 0, 'Unlimited', 0, 'Unlimited', '5g', 25.00, 39.99, true, true, 81),
  ('EE', 'ee', 'Unlimited', 'Unlimited data with unlimited calls & texts - EE UK', 'GB', NULL, 'Unlimited', true, 0, 'Unlimited', 0, 'Unlimited', '5g', 38.00, 54.99, true, false, 82),

  -- Three (UK)
  ('Three', 'three', '10GB Plan', '10GB data with unlimited calls & texts - Three UK', 'GB', 10, '10GB', false, 0, 'Unlimited', 0, 'Unlimited', '4g', 15.00, 24.99, true, false, 90),
  ('Three', 'three', 'Unlimited', 'Unlimited data with unlimited calls & texts - Three UK', 'GB', NULL, 'Unlimited', true, 0, 'Unlimited', 0, 'Unlimited', '5g', 28.00, 44.99, true, false, 91),

  -- Orange (FR)
  ('Orange', 'orange', '10GB Plan', '10GB data with unlimited calls & SMS - Orange France', 'FR', 10, '10GB', false, 0, 'Unlimited', 0, 'Unlimited', '4g', 18.00, 29.99, true, false, 100),
  ('Orange', 'orange', '50GB Plan', '50GB data with unlimited calls & SMS - Orange France', 'FR', 50, '50GB', false, 0, 'Unlimited', 0, 'Unlimited', '5g', 30.00, 44.99, true, false, 101),

  -- Telcel (MX)
  ('Telcel', 'telcel', '3GB Plan', '3GB data with unlimited calls & SMS - Telcel Mexico', 'MX', 3, '3GB', false, 0, 'Unlimited', 0, 'Unlimited', '4g', 12.00, 19.99, true, false, 110),
  ('Telcel', 'telcel', '10GB Plan', '10GB data with unlimited calls & SMS - Telcel Mexico', 'MX', 10, '10GB', false, 0, 'Unlimited', 0, 'Unlimited', '4g', 22.00, 34.99, true, false, 111),

  -- Airtel (IN)
  ('Airtel', 'airtel', '2GB Daily', '2GB daily data with unlimited calls - Airtel India (28 days)', 'IN', 2, '2GB/day', false, 0, 'Unlimited', 0, 'Unlimited', '4g', 5.00, 9.99, true, false, 120),
  ('Airtel', 'airtel', 'Unlimited Daily', 'Unlimited daily data with unlimited calls - Airtel India (28 days)', 'IN', NULL, 'Unlimited', true, 0, 'Unlimited', 0, 'Unlimited', '5g', 9.00, 14.99, true, false, 121),

  -- MTN (NG)
  ('MTN', 'mtn', '5GB Plan', '5GB data with calls & SMS - MTN Nigeria', 'NG', 5, '5GB', false, 0, 'Unlimited', 0, 'Unlimited', '4g', 8.00, 14.99, true, false, 130),
  ('MTN', 'mtn', '20GB Plan', '20GB data with calls & SMS - MTN Nigeria', 'NG', 20, '20GB', false, 0, 'Unlimited', 0, 'Unlimited', '4g', 15.00, 24.99, true, false, 131),

  -- Claro (BR)
  ('Claro', 'claro', '10GB Plan', '10GB data with unlimited calls & SMS - Claro Brazil', 'BR', 10, '10GB', false, 0, 'Unlimited', 0, 'Unlimited', '4g', 12.00, 19.99, true, false, 140),
  ('Claro', 'claro', '25GB Plan', '25GB data with unlimited calls & SMS - Claro Brazil', 'BR', 25, '25GB', false, 0, 'Unlimited', 0, 'Unlimited', '5g', 20.00, 34.99, true, false, 141)
ON CONFLICT DO NOTHING;
