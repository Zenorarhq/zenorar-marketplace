-- Seed eSIM Countries with region mappings
-- Uses actual region IDs from esim_regions table

-- =====================================================
-- Europe
-- =====================================================
INSERT INTO esim_countries (region_id, name, iso_code, flag_emoji, dial_code, networks)
SELECT r.id, c.name, c.iso_code, c.flag_emoji, c.dial_code, c.networks::TEXT[]
FROM esim_regions r,
(VALUES
  ('France',        'FR', '🇫🇷', '+33',  ARRAY['Orange','SFR','Bouygues','Free']),
  ('Germany',       'DE', '🇩🇪', '+49',  ARRAY['Telekom','Vodafone','O2']),
  ('United Kingdom','GB', '🇬🇧', '+44',  ARRAY['EE','Three','Vodafone','O2']),
  ('Spain',         'ES', '🇪🇸', '+34',  ARRAY['Movistar','Vodafone','Orange']),
  ('Italy',         'IT', '🇮🇹', '+39',  ARRAY['TIM','Vodafone','WindTre']),
  ('Netherlands',   'NL', '🇳🇱', '+31',  ARRAY['KPN','T-Mobile','Vodafone']),
  ('Belgium',       'BE', '🇧🇪', '+32',  ARRAY['Proximus','Orange','Base']),
  ('Switzerland',   'CH', '🇨🇭', '+41',  ARRAY['Swisscom','Sunrise','Salt']),
  ('Austria',       'AT', '🇦🇹', '+43',  ARRAY['A1','Magenta','Drei']),
  ('Portugal',      'PT', '🇵🇹', '+351', ARRAY['MEO','NOS','Vodafone']),
  ('Ireland',       'IE', '🇮🇪', '+353', ARRAY['Three','Vodafone','Eir']),
  ('Sweden',        'SE', '🇸🇪', '+46',  ARRAY['Telia','Tele2','Tre']),
  ('Norway',        'NO', '🇳🇴', '+47',  ARRAY['Telenor','Telia','Ice']),
  ('Denmark',       'DK', '🇩🇰', '+45',  ARRAY['TDC','Telenor','Tre']),
  ('Finland',       'FI', '🇫🇮', '+358', ARRAY['Elisa','DNA','Telia']),
  ('Poland',        'PL', '🇵🇱', '+48',  ARRAY['Orange','T-Mobile','Play']),
  ('Czech Republic','CZ', '🇨🇿', '+420', ARRAY['O2','T-Mobile','Vodafone']),
  ('Greece',        'GR', '🇬🇷', '+30',  ARRAY['Cosmote','Vodafone','Wind']),
  ('Hungary',       'HU', '🇭🇺', '+36',  ARRAY['Telekom','Telenor','Vodafone']),
  ('Romania',       'RO', '🇷🇴', '+40',  ARRAY['Orange','Vodafone','Digi']),
  ('Croatia',       'HR', '🇭🇷', '+385', ARRAY['HT','A1','Telemach']),
  ('Iceland',       'IS', '🇮🇸', '+354', ARRAY['Siminn','Nova','Vodafone']),
  ('Turkey',        'TR', '🇹🇷', '+90',  ARRAY['Turkcell','Vodafone','Turk Telekom'])
) AS c(name, iso_code, flag_emoji, dial_code, networks)
WHERE r.slug = 'europe'
ON CONFLICT (iso_code) DO NOTHING;

-- =====================================================
-- North America
-- =====================================================
INSERT INTO esim_countries (region_id, name, iso_code, flag_emoji, dial_code, networks)
SELECT r.id, c.name, c.iso_code, c.flag_emoji, c.dial_code, c.networks::TEXT[]
FROM esim_regions r,
(VALUES
  ('United States', 'US', '🇺🇸', '+1',   ARRAY['T-Mobile','AT&T','Verizon']),
  ('Canada',        'CA', '🇨🇦', '+1',   ARRAY['Rogers','Bell','Telus']),
  ('Mexico',        'MX', '🇲🇽', '+52',  ARRAY['Telcel','AT&T','Movistar'])
) AS c(name, iso_code, flag_emoji, dial_code, networks)
WHERE r.slug = 'north-america'
ON CONFLICT (iso_code) DO NOTHING;

-- =====================================================
-- Asia Pacific
-- =====================================================
INSERT INTO esim_countries (region_id, name, iso_code, flag_emoji, dial_code, networks)
SELECT r.id, c.name, c.iso_code, c.flag_emoji, c.dial_code, c.networks::TEXT[]
FROM esim_regions r,
(VALUES
  ('Japan',         'JP', '🇯🇵', '+81',  ARRAY['NTT Docomo','au','SoftBank']),
  ('South Korea',   'KR', '🇰🇷', '+82',  ARRAY['SK Telecom','KT','LG U+']),
  ('Thailand',      'TH', '🇹🇭', '+66',  ARRAY['AIS','DTAC','TrueMove']),
  ('Singapore',     'SG', '🇸🇬', '+65',  ARRAY['Singtel','StarHub','M1']),
  ('Australia',     'AU', '🇦🇺', '+61',  ARRAY['Telstra','Optus','Vodafone']),
  ('New Zealand',   'NZ', '🇳🇿', '+64',  ARRAY['Spark','Vodafone','2degrees']),
  ('India',         'IN', '🇮🇳', '+91',  ARRAY['Jio','Airtel','Vi']),
  ('China',         'CN', '🇨🇳', '+86',  ARRAY['China Mobile','China Unicom','China Telecom']),
  ('Hong Kong',     'HK', '🇭🇰', '+852', ARRAY['CSL','3HK','SmarTone']),
  ('Taiwan',        'TW', '🇹🇼', '+886', ARRAY['Chunghwa','Taiwan Mobile','FarEasTone']),
  ('Malaysia',      'MY', '🇲🇾', '+60',  ARRAY['Maxis','Celcom','Digi']),
  ('Indonesia',     'ID', '🇮🇩', '+62',  ARRAY['Telkomsel','Indosat','XL']),
  ('Philippines',   'PH', '🇵🇭', '+63',  ARRAY['Globe','Smart','DITO']),
  ('Vietnam',       'VN', '🇻🇳', '+84',  ARRAY['Viettel','Mobifone','Vinaphone'])
) AS c(name, iso_code, flag_emoji, dial_code, networks)
WHERE r.slug = 'asia-pacific'
ON CONFLICT (iso_code) DO NOTHING;

-- =====================================================
-- Middle East
-- =====================================================
INSERT INTO esim_countries (region_id, name, iso_code, flag_emoji, dial_code, networks)
SELECT r.id, c.name, c.iso_code, c.flag_emoji, c.dial_code, c.networks::TEXT[]
FROM esim_regions r,
(VALUES
  ('United Arab Emirates','AE','🇦🇪','+971', ARRAY['Etisalat','du']),
  ('Saudi Arabia',  'SA', '🇸🇦', '+966', ARRAY['STC','Mobily','Zain']),
  ('Qatar',         'QA', '🇶🇦', '+974', ARRAY['Ooredoo','Vodafone']),
  ('Kuwait',        'KW', '🇰🇼', '+965', ARRAY['Zain','Ooredoo','STC']),
  ('Bahrain',       'BH', '🇧🇭', '+973', ARRAY['Batelco','Zain','STC']),
  ('Oman',          'OM', '🇴🇲', '+968', ARRAY['Omantel','Ooredoo']),
  ('Israel',        'IL', '🇮🇱', '+972', ARRAY['Cellcom','Partner','Pelephone']),
  ('Jordan',        'JO', '🇯🇴', '+962', ARRAY['Zain','Orange','Umniah'])
) AS c(name, iso_code, flag_emoji, dial_code, networks)
WHERE r.slug = 'middle-east'
ON CONFLICT (iso_code) DO NOTHING;

-- =====================================================
-- Africa
-- =====================================================
INSERT INTO esim_countries (region_id, name, iso_code, flag_emoji, dial_code, networks)
SELECT r.id, c.name, c.iso_code, c.flag_emoji, c.dial_code, c.networks::TEXT[]
FROM esim_regions r,
(VALUES
  ('South Africa',  'ZA', '🇿🇦', '+27',  ARRAY['Vodacom','MTN','Cell C']),
  ('Nigeria',       'NG', '🇳🇬', '+234', ARRAY['MTN','Airtel','Glo']),
  ('Kenya',         'KE', '🇰🇪', '+254', ARRAY['Safaricom','Airtel','Telkom']),
  ('Egypt',         'EG', '🇪🇬', '+20',  ARRAY['Vodafone','Orange','Etisalat']),
  ('Morocco',       'MA', '🇲🇦', '+212', ARRAY['Maroc Telecom','Orange','Inwi']),
  ('Ghana',         'GH', '🇬🇭', '+233', ARRAY['MTN','Vodafone','AirtelTigo']),
  ('Tanzania',      'TZ', '🇹🇿', '+255', ARRAY['Vodacom','Airtel','Tigo'])
) AS c(name, iso_code, flag_emoji, dial_code, networks)
WHERE r.slug = 'africa'
ON CONFLICT (iso_code) DO NOTHING;

-- =====================================================
-- South America
-- =====================================================
INSERT INTO esim_countries (region_id, name, iso_code, flag_emoji, dial_code, networks)
SELECT r.id, c.name, c.iso_code, c.flag_emoji, c.dial_code, c.networks::TEXT[]
FROM esim_regions r,
(VALUES
  ('Brazil',        'BR', '🇧🇷', '+55',  ARRAY['Claro','Vivo','TIM']),
  ('Argentina',     'AR', '🇦🇷', '+54',  ARRAY['Claro','Movistar','Personal']),
  ('Colombia',      'CO', '🇨🇴', '+57',  ARRAY['Claro','Movistar','Tigo']),
  ('Chile',         'CL', '🇨🇱', '+56',  ARRAY['Entel','Movistar','Claro']),
  ('Peru',          'PE', '🇵🇪', '+51',  ARRAY['Claro','Movistar','Entel']),
  ('Ecuador',       'EC', '🇪🇨', '+593', ARRAY['Claro','Movistar','CNT'])
) AS c(name, iso_code, flag_emoji, dial_code, networks)
WHERE r.slug = 'south-america'
ON CONFLICT (iso_code) DO NOTHING;

-- =====================================================
-- Update region country counts
-- =====================================================
UPDATE esim_regions SET country_count = (
  SELECT COUNT(*) FROM esim_countries WHERE region_id = esim_regions.id
);
