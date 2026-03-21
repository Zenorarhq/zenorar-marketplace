'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Icon from '@/components/ui/Icon'
import Breadcrumbs from '@/components/ui/Breadcrumbs'
import { useCart } from '@/lib/cart-context'
import { useAuth } from '@/contexts/AuthContext'
import { usePreferences } from '@/contexts/PreferencesContext'
import { convertPrice, getExchangeRate } from '@/lib/currency'
import { localApiFetch } from '@/lib/api/client'
import { getBalance } from '@/lib/api/wallet'
import AuthDialog from '@/components/dialogs/AuthDialog'
import DepositModal from '@/components/wallet/DepositModal'
import WalletDisplay from '@/components/ui/WalletDisplay'
import TestModeBanner from '@/components/ui/TestModeBanner'

interface GiftCard {
  id: string
  brand: string
  slug: string
  category: string
  description: string
  imageUrl: string | null
  denominations: number[]
  discountPercent: number
  isFeatured: boolean
  minCustomAmount: number | null
  maxCustomAmount: number | null
  inStock: boolean
}

interface Category {
  name: string
  count: number
}

const categoryIcons: Record<string, string> = {
  gaming: 'zap',
  shopping: 'cart',
  software: 'code',
  food: 'heart',
  payment: 'wallet',
  travel: 'airplane',
  streaming: 'play-circle',
  entertainment: 'video',
  retail: 'store',
  other: 'wallet',
}

// Display order for category tabs
const CATEGORY_ORDER = ['gaming', 'shopping', 'software', 'food', 'payment', 'travel', 'streaming', 'entertainment', 'retail']

// Rename categories for display
const CATEGORY_DISPLAY_NAME: Record<string, string> = {
  other: 'Payment',
  payment: 'Payment',
}

// Popularity-based brand ordering (lower = appears first), modelled after Bitrefill US
// Keys are lowercase, matched against brand.toLowerCase()
const BRAND_POPULARITY: Record<string, number> = {
  // Mega-tier
  'amazon':1,'amazon.com':1,
  'apple':2,'apple gift card':2,'itunes':2,'app store & itunes':2,
  'google play':3,'google play gift card':3,
  'visa':4,'visa gift card':4,
  'mastercard':5,'mastercard gift card':5,
  'american express':6,'amex':6,
  // Gaming — Bitrefill US order
  'steam':10,'steam gift card':10,'steam wallet':10,
  'playstation':11,'psn':11,'playstation network':11,'playstation store':11,'ps store':11,
  'xbox':12,'xbox gift card':12,'microsoft':12,'microsoft gift card':12,'xbox live':12,
  'nintendo':13,'nintendo eshop':13,'nintendo switch':13,'nintendo switch online':13,
  'roblox':14,'roblox gift card':14,
  'fortnite':15,'epic games':15,'fortnite v-bucks':15,
  'league of legends':16,'riot games':16,'riot points':16,'lol':16,
  'valorant':17,'valorant points':17,
  'minecraft':18,
  'pubg':19,'pubg mobile':19,
  'razer gold':20,'razer':20,
  'blizzard':21,'battle.net':21,'battlenet':21,'world of warcraft':21,'wow':21,
  'ea':22,'ea play':22,'ea sports':22,'origin':22,
  'genshin impact':23,'mihoyo':23,
  'final fantasy':24,'square enix':24,
  'runescape':25,
  'warframe':26,'warframe platinum':26,
  'apex legends':27,
  'call of duty':28,'cod':28,
  'fifa':29,'fifa points':29,
  'psnow':30,'ps now':30,'ps plus':30,'playstation plus':30,
  'xbox game pass':31,'game pass':31,
  'garena':32,'free fire':32,
  'mobile legends':33,
  'clash of clans':34,'supercell':34,
  'pokemon':35,'pokemon go':35,
  // Streaming
  'netflix':20,'netflix gift card':20,
  'hulu':21,
  'disney+':22,'disney plus':22,'disney':22,
  'hbo':23,'hbo max':23,'max':23,
  'spotify':24,'spotify gift card':24,
  'apple tv+':25,'apple tv':25,
  'youtube':26,'youtube premium':26,'youtube music':26,
  'paramount+':27,'paramount plus':27,
  'peacock':28,
  'showtime':29,
  'crunchyroll':30,
  'twitch':31,
  // Shopping
  'walmart':40,'walmart gift card':40,
  'target':41,'target gift card':41,
  'best buy':42,
  'ebay':43,
  'etsy':44,
  'shein':45,
  'nike':46,
  'adidas':47,
  'nordstrom':48,
  'gap':49,
  'old navy':50,
  'h&m':51,'h&m us':51,
  'zara':52,
  'macy\'s':53,'macys':53,
  'sephora':54,
  'ulta':55,
  'bath & body works':56,
  // Food & Delivery
  'starbucks':60,'starbucks gift card':60,
  'uber':61,'uber gift card':61,
  'doordash':62,
  'grubhub':63,
  'mcdonalds':64,'mcdonald\'s':64,
  'chipotle':65,
  'chick-fil-a':66,'chick fil a':66,
  'subway':67,
  'dunkin':68,"dunkin'":68,
  'burger king':69,
  'dominos':70,"domino's":70,
  'pizza hut':71,
  // Travel
  'airbnb':80,
  'booking.com':81,
  'hotels.com':82,
  'expedia':83,
  'delta':84,'delta airlines':84,
  'american airlines':85,
  'united airlines':86,
  // Entertainment
  'amc':90,'amc theatres':90,
  'fandango':91,
  'regal':92,
  // Retail / Others
  'cvs':100,
  'walgreens':101,
  'home depot':102,
  "lowe's":103,'lowes':103,
  'ikea':104,
  'gamestop':105,
  'dollar general':106,
}

// Strip price suffixes from API brand names for display only (e.g. "Visa Prepaid US $1 to $150" → "Visa Prepaid US")
const cleanBrandName = (brand: string): string =>
  brand.replace(/\s+\$[\d,.]+(\s+(to|-)\s+\$[\d,.]+)?.*$/i, '').trim()

const getBrandPriority = (brand: string): number => {
  const key = brand.toLowerCase().trim()
  if (BRAND_POPULARITY[key] !== undefined) return BRAND_POPULARITY[key]
  // Partial match
  for (const [k, v] of Object.entries(BRAND_POPULARITY)) {
    if (key.includes(k) || k.includes(key)) return v
  }
  return 999
}

// Kept for reference but no longer used — Bitrefill CDN blocked on gift cards
// const B = 'https://cdn.bitrefill.com/primg/w360h216/'
const BRAND_BITREFILL_SLUGS: Record<string, string> = {
  // === GAMING ===
  'steam':               'steam-usa',
  'steam wallet':        'steam-usa',
  'playstation':         'sony-playstation-usa',
  'playstation store':   'sony-playstation-usa',
  'psn':                 'sony-playstation-usa',
  'ps store':            'sony-playstation-usa',
  'ps plus':             'playstation-plus-usa',
  'playstation plus':    'playstation-plus-usa',
  'xbox':                'xbox-usa',
  'xbox live':           'xbox-usa',
  'xbox game pass':      'xbox-game-pass-ultimate-usa',
  'microsoft':           'microsoft-gift-card-usa',
  'nintendo':            'nintendo-eshop-usa',
  'nintendo eshop':      'nintendo-eshop-usa',
  'nintendo switch':     'nintendo-eshop-usa',
  'roblox':              'roblox-usa',
  'fortnite':            'fortnite-v-bucks-usa',
  'fortnite v-bucks':    'fortnite-v-bucks-usa',
  'epic games':          'epic-games-usa',
  'league of legends':   'league-of-legends-usa',
  'riot games':          'league-of-legends-usa',
  'valorant':            'valorant-usa',
  'minecraft':           'minecraft-usa',
  'pubg':                'pubg-mobile-usa',
  'pubg mobile':         'pubg-mobile-usa',
  'razer gold':          'razer-gold-usa',
  'blizzard':            'blizzard-usa',
  'battle.net':          'blizzard-usa',
  'genshin impact':      'genshin-impact-usa',
  'square enix':         'square-enix-usa',
  'final fantasy':       'square-enix-usa',
  'runescape':           'runescape-usa',
  'apex legends':        'apex-legends-usa',
  'call of duty':        'call-of-duty-usa',
  'garena':              'free-fire-singapore',
  'free fire':           'free-fire-singapore',
  'mobile legends':      'mobile-legends-usa',
  'twitch':              'twitch-usa',
  'gamestop':            'gamestop-usa',
  // === MEGA BRANDS ===
  'amazon':              'amazon-usa',
  'amazon.com':          'amazon-usa',
  'apple':               'apple-gift-card-usa',
  'app store & itunes':  'apple-gift-card-usa',
  'itunes':              'apple-gift-card-usa',
  'google play':         'google-play-australia',
  'visa':                'vanilla-visa-usa',
  'mastercard':          'mastercard-gift-card-usa',
  // === STREAMING ===
  'netflix':             'netflix-usa',
  'spotify':             'spotify-usa',
  'hulu':                'hulu-usa',
  'disney+':             'disney-plus-usa',
  'disney plus':         'disney-plus-usa',
  'crunchyroll':         'crunchyroll-usa',
  // === SHOPPING ===
  'walmart':             'walmart-usa',
  'target':              'target-usa',
  'best buy':            'best-buy-usa',
  'ebay':                'ebay-usa',
  'etsy':                'etsy-usa',
  'nordstrom':           'nordstrom-usa',
  'sephora':             'sephora-usa',
  'nike':                'nike-usa',
  'home depot':          'home-depot-usa',
  // === FOOD ===
  "applebee's":          'applebee_s-guatemala',
  'starbucks':           'starbucks-usa',
  'doordash':            'doordash-usa',
  'grubhub':             'grubhub-usa',
  'chipotle':            'chipotle-usa',
  'mcdonalds':           'mcdonalds-usa',
  "mcdonald's":          'mcdonalds-usa',
  // === TRAVEL ===
  'airbnb':              'airbnb-usa',
  'uber':                'uber-usa',
  'hotels.com':          'hotels_com-usa',
  'fairmont hotel':      'fairmont-hotels-and-resorts-ca',
  // === ENTERTAINMENT ===
  'amc':                 'amc-theatres-usa',
  'amc entertainment':   'amc-theatres-usa',
  'fandango':            'fandango-usa',
  'regal entertainment':           'regal-premiere-ticket-usa',
  'regal entertainment group us':  'regal-premiere-ticket-usa',
  // === SHOPPING (additional) ===
  'banana republic (gap) us':  'banana-republic-usa',
  'banana republic':           'banana-republic-usa',
  'adidas':                    'adidas-usa',
  'gap':                       'gap-usa',
  'old navy':                  'old-navy-usa',
  'h&m':                       'handm-uk',
  'h&m us':                    'handm-uk',
  "macy's":                    'macys-usa',
  "macy's us":                 'macys-usa',
  'abercrombie & fitch us':    'abercrombie-and-fitch-usa',
  'advance auto parts':        'advance-auto-parts-usa',
  'albertsons':                'albertsons-usa',
  'allmodern.com':             'allmodern_com-us',
  'ann taylor':                'ann-taylor-us',
  'aerie':                     'aerie-usa',
  'aeropostale':               'aeropostale-_-apparel-uae',
  'asos':                      'asos-usa',
  'asos us':                   'asos-usa',
  'athleta':                   'athleta-usa',
  'autozone':                  'autozone-usa',
  'baby depot':                'baby-depot-at-burlington-usa',
  'barnes & noble us':         'barnes-and-noble-usa',
  'barnes and nobles':         'barnes-and-noble-usa',
  'baskin robbins':            'baskin-robbins-singapore',
  'bass pro shop':             'bass-pro-shops-usa',
  'lowes':                     'lowe_s-usa',
  '1-800-flowers':             '1-800-flowers-com-usa',
  '1-800-pet supplies':        '1-800-petsupplies-usa',
  '1-800-petsupplies':         '1-800-petsupplies-usa',
  '1-800-baskets':             '1-800-baskets_com-usa',
  // === FOOD (additional) ===
  'subway':                    'subway-usa',
  'dunkin':                    'dunkin-donuts-singapore',
  "domino's":                  'dominos-usa',
  'antie anne':                'auntie-anne_s-thailand',
  'aquarium':                  'aquarium-restaurant-usa',
  'bahama breeze':             'bahama-breeze-island-grille-usa',
  'baja fresh':                'baja-fresh-mexican-grill-usa',
  "baker's square":            'bakers-square-us',
  // === TRAVEL (additional) ===
  'delta airlines':            'delta-air-lines-usa',
  'amtrak':                    'amtrak-usa',
  // === US VARIANT NAMES (same product, different brand name in DB) ===
  'nintendo us':                                    'nintendo-eshop-usa',
  'playstation us':                                 'sony-playstation-usa',
  'xbox us':                                        'xbox-usa',
  'xbox live us':                                   'xbox-usa',
  'xbox game pass 3 month us':                      'xbox-game-pass-ultimate-usa',
  'roblox us':                                      'roblox-usa',
  'steam us':                                       'steam-usa',
  'minecraft us':                                   'minecraft-usa',
  'razer gold (global) us':                         'razer-gold-usa',
  'mobile legends diamonds (global) us':            'mobile-legends-usa',
  'fortnite (standard edition) 1000-v-bucks us':   'fortnite-v-bucks-usa',
  'fortnite (standard edition) 2800-v-bucks us':   'fortnite-v-bucks-usa',
  'fortnite (standard edition) 5000-v-bucks us':   'fortnite-v-bucks-usa',
  'fortnite (standard edition) 13500-v-bucks us':  'fortnite-v-bucks-usa',
  'free fire 100 + 10 diamond us':                 'free-fire-singapore',
  'free fire 210 + 21 diamond us':                 'free-fire-singapore',
  'free fire 530 + 53 diamond us':                 'free-fire-singapore',
  'free fire 1080 + 108 diamond us':               'free-fire-singapore',
  'free fire 2200 + 220 diamond us':               'free-fire-singapore',
  'amazon us':                                     'amazon-usa',
  'app store & itunes us':                         'apple-gift-card-usa',
  'netflix us':                                    'netflix-usa',
  'spotify us':                                    'spotify-usa',
  'hulu plus':                                     'hulu-usa',
  'starbucks us':                                  'starbucks-usa',
  'target us':                                     'target-usa',
  'nordstrom us':                                  'nordstrom-usa',
  'sephora us':                                    'sephora-usa',
  'nike us':                                       'nike-usa',
  'airbnb us':                                     'airbnb-usa',
  'ea 12 month (xbox) us':                         'xbox-usa',
  'pubg mobile uc (global) us':                    'pubg-mobile-usa',
  'pubg new state (global) us':                    'pubg-mobile-usa',
  'babin seafood':                                 'babins-seafood-house-usa',
  'bristol seafood':                               'bristol-seafood-grill-us',
  'build-a-bear':                                  'build-a-bear-uae',
  'devon seafood grill':                           'devon-seafood-grill-us',
  'elearn gift':                                   'elearngift-latvia',
  'famous footwear':                               'famous-footwear-usa',
  'giant eagle':                                   'giant-eagle-us',
  'l.l.bean':                                      'l_l_bean-usa',
  'legal sea foods':                               'legal-sea-foods-usa',
  'omaha steaks':                                  'omaha-steaks-usa',
  'outback steakhouse us':                         'outback-steakhouse-usa',
  "bertucci's":                  'bertucci_s-usa',
  "bill's bar & burguer":        'bills-bar-and-burger-usa',
  'birch lane':                  'birchlane_com-us',
  'blaze pizza':                 'blaze-pizza-us',
  'bob evans':                   'bob-evans-restaurants-us',
  "boscov's":                    'boscovs-usa',
  'br guest hospitality':        'br-guest-hospitality-usa',
  "brenner's stakehouse":        'brenner_s-steakhouse-usa',
  'brick house tavern':          'brick-house-tavern-and-tap-usa',
  'bubba gump':                  'bubba-gump-shrimp-company-usa',
  'bucketlist gift':             'bucketlistgift-se',
  'buffalo wild wings':          'buffalo-wild-wings-usa',
  'burlington':                  'burlington-usa',
  'cadillac bar':                'cadillac-bar-usa',
  'cadillac ranch':              'cadillac-ranch-us',
  'carnival cruises':            'carnival-cruise-lines-usa',
  "carter's":                    'carters-brazil',
  'cb2':                         'cb2-usa',
  'cb2 us':                      'cb2-usa',
  'celebrity cruises':           'celebrity-cruises-usa',
  'chart house':                 'chart-house-usa',
  "cheddar's scratch kitchen":   'cheddars-scratch-kitchen-usa',
  "cheryl's":                    'cheryl_s-cookies-usa',
  'chevron texaco':              'chevron-and-texaco-us',
  'chewy':                       'chewy-usa',
  "chico's":                     'chico_s-usa',
  'chilis':                      'chili_s-grill-and-bar-usa',
  "chuck'e cheese":              'chuck-e_-cheese_s-usa',
  'cinnabon':                    'cinnabon-usa',
  'claim jumper stakehouse & bar': 'claim-jumper-usa',
  'clinkerdagger':               'clinkerdagger-us',
  'conoco':                      'phillips-66-conoco-76-us',
  'cracker barrel':              'cracker-barrel-old-country-store-usa',
  'cost plus':                   'cost-plus-world-market-usa',
  'craft f&b':                   'craft-fandb-us',
  "crate n' kids":               'crate-and-kids-canada',
  'crutchfield':                 'crutchfield-usa',
  "cutter's crabhouse":          'cutters-crabhouse-us',
  'darden restaurants':          'darden-usa',
  'dave & buster':               'dave-and-busters-usa',
  "dick's sporting goods":       'dick_s-sporting-goods-usa',
  'discord nitro':               'discord-nitro-us',
  'dos caminos':                 'dos-caminos-usa',
  'dsw':                         'dsw-everyday-us',
  'exapunks':                    'exapunks-usa',
  'famous dave bbq':             'famous-daves-usa',
  "peet's coffee & tea":                           'peets-coffee-and-tea-usa',
  'royal caribbean':                               'royal-caribbean-usa',
  'season 52':                                     'seasons-52-usa',
  "steak n' shake":                                'steak-_n-shake-usa',
  'the coffee bean & tea leaf':                    'the-coffee-bean-and-tea-leaf-philippines',
  'ulta beauty us':                                'ulta-beauty-usa',
  'paramount plus':                                'paramount-colombia',
  'cbsi paramount plus':                           'paramount-colombia',
  'girls who code':                                'girls-who-code-usa',
  'showtime':                                      'showtime-usa',
  // === BATCH: W/V/U/T brands ===
  'stubhub':                   'stubhub-usa',
  'stubhub us':                'stubhub-usa',
  'taco bell':                 'taco-bell-malaysia',
  'texas roadhouse':           'texas-roadhouse-usa',
  'the cheesecake factory':    'the-cheesecake-factory-usa',
  'the container store':       'the-container-store-usa',
  'the ocenaire':              'the-oceanaire-seafood-room-usa',
  'the popcorn factory':       'the-popcorn-factory-usa',
  'the vitamin shop':          'the-vitamin-shoppe-us',
  'thredup':                   'thredup-us',
  'tidal':                     'tidal-usa',
  'tjx':                       'tjx-canada',
  'topgolf':                   'topgolf-usa',
  'under armour':              'under-armour-usa',
  'under armour® us':          'under-armour-usa',
  'vic n anthony\'s':          'vic-and-anthony_s-steakhouse-usa',
  'vudu':                      'vudu-_fandango_-us',
  'wayfair':                   'wayfair_ca-canada',
  'wayfair us':                'wayfair_ca-canada',
  'west elm':                  'west-elm-usa',
  'wetgo car wash':            'wetgo-car-wash-locations-us',
  'williams sonoma':           'williams-sonoma-usa',
  'willie g':                  'willie-g_s-seafood-and-steaks-usa',
  'wolferman\'s':              'wolferman_s-usa',
  'yankee candle':             'yankee-candle-usa',
  'yard house':                'yard-house-usa',
  // === BATCH: R/S brands ===
  'primark':                   'primark-uk',
  'princess cruises':          'princess-cruise-lines-usa',
  'raffles hotels & resort':   'raffles-hotels-and-resorts-usa',
  'rainforest café':           'rainforest-cafe-usa',
  'rainforest cafe':           'rainforest-cafe-usa',
  'red lobster':               'red-lobster-usa',
  'red robin':                 'red-robin-usa',
  'rei':                       'rei-usa',
  'river crab/blue water inn': 'river-crab-_-bluewater-inn-usa',
  "ruth's chris stakehouse":   'ruths-chris-steakhouse-usa',
  "ruth's chris steakhouse":   'ruths-chris-steakhouse-usa',
  'safeway':                   'safeway-ca',
  'saks fifth avenue':         'saks-fifth-avenue-usa',
  'saltgrass stakehouse':      'saltgrass-steakhouse-usa',
  "sam's club":                'cashi-sams-club-mexico',
  'sheetz':                    'sheetz-usa',
  'shutterfly':                'shutterfly-usa',
  'sierra':                    'sierra-trading-post-usa',
  'simply chocolate':          'simply-chocolate-usa',
  'sirius xm':                 'siriusxm-usa',
  'sonic app':                 'sonic-us',
  'southwest airlines':        'southwest-airlines-usa',
  'sportsmans warehouse':      'sportsman_s-warehouse-usa',
  'staples':                   'staples-usa',
  'stitch fix':                'stitch-fix-usa',
  'stock yards':               'stock-yards-usa',
  'strip house':               'strip-house-usa',
  // === BATCH: F/G brands ===
  'fanatics':                  'fanatics-usa',
  'finish line':               'finish-line-us',
  'fish tales':                'fish-tales-usa',
  "fisherman's wharf":         'fisherman_s-wharf-seafood-grill-usa',
  'five guys':                 'five-guys-de',
  "flemming's stakehouse":     'flemings-prime-steakhouse-and-wine-bar-usa',
  'flying dutchman':           'flying-dutchman-usa',
  'fragrancenet.com':          'fragrancenet_com-usa',
  "fricker's sports bar":      'fricker_s-us',
  'fruit bouquets':            'fruit-bouquets-usa',
  'gander outdoors':           'gander-outdoors-usa',
  'gandy dancer':              'gandy-dancer-usa',
  'global experiencies':       'global-experience-card-hu',
  'global hotel':              'global-hotel-card-japan',
  'go play golf':              'go-play-golf-usa',
  'go rio cruises':            'go-rio-san-antonio-river-cruises-us',
  'golden nugget casino':      'golden-nugget-usa',
  'goodcents':                 'goodcents-usa',
  'grotto':                    'grotto-usa',
  'groupon':                   'groupon-canada',
  'groupon us':                'groupon-canada',
  'guess':                     'guess-ae',
  'guild wars':                'guild-wars-2-gem-card-us',
  'guitar center':             'guitar-center-usa',
}

// Reserved for re-enablement — Reloadly/Cloudinary artwork not currently active in the visual
const getCardImage = (card: { brand: string; imageUrl: string | null }): string | null => {
  if (card.imageUrl?.includes('res.cloudinary.com') || card.imageUrl?.includes('cdn.reloadly.com')) return card.imageUrl
  return null
}

// Returns Bitrefill CDN URL only for brands explicitly in the slug map.
// Auto-derivation removed — Bitrefill CDN returns a 404 image (not HTTP 404)
// so onError never fires for unknown slugs.
function getBitrefillUrl(brand: string): string | null {
  const key = brand.toLowerCase().trim()
  const slug = BRAND_BITREFILL_SLUGS[key]
  return slug ? `https://cdn.bitrefill.com/primg/w360h216/${slug}.webp` : null
}

// Overrides for wrong clearbit domains + the 6 brands with no image_url
const DOMAIN_OVERRIDES: Record<string, string> = {
  'amc entertainment':             'amctheatres.com',
  'allmodern.com':                 'allmodern.com',
  'antie anne':                    'auntieannes.com',
  'discord nitro':                 'discord.com',
  'ea play':                       'ea.com',
  'free fire':                     'ff.garena.com',
  'hotels.com':                    'hotels.com',
  "moe's southwest grill":         'moes.com',
  'minecraft':                     'minecraft.net',
  'regal entertainment':           'regmovies.com',
  'unicef':                        'unicef.org',
  'glaad':                         'glaad.org',
  'special olympics':              'specialolympics.org',
  // NULL image_url brands
  'h&m':                           'hm.com',
  "cheddar's scratch kitchen":     'cheddars.com',
  'claim jumper stakehouse & bar': 'claimjumper.com',
  'equal justice initiative':      'eji.org',
  'king ranch texas kitchen':      'kingranchtexaskitchen.com',
  // Subsidiary brands — their domains serve the parent company logo, force initial fallback
  'banana republic':               '',
  'athleta':                       '',
  'old navy':                      '',
  'marshalls':                     '',
  'home goods':                    '',
  'home sense':                    '',
  'sierra':                        '',
  'birch lane':                    '',
  'joss and main':                 '',
  'perigold':                      '',
  'pottery barn':                  '',
  'west elm':                      '',
  'mark & graham':                 '',
  'season 52':                     '',
  'yard house':                    '',
  'bahama breeze':                 '',
}

function getBrandDomain(brand: string, imageUrl: string | null): string | null {
  const key = brand.toLowerCase().trim()
  // 1. Known overrides — fix wrong clearbit domains + null image_url brands
  // Empty string means "no logo" (subsidiary brands that serve parent company logo)
  if (key in DOMAIN_OVERRIDES) return DOMAIN_OVERRIDES[key] || null
  // 2. Extract domain already stored in the clearbit URL
  if (imageUrl?.includes('logo.clearbit.com/')) {
    const domain = imageUrl.split('logo.clearbit.com/')[1]
    if (domain) return domain
  }
  // 3. Last resort: guess from brand name
  const slug = key
    .replace(/\s*(us|usa|global|gift\s*card|gift|card|prepaid|store|shop)\s*/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 30)
  return slug ? `${slug}.com` : null
}

// Brand-specific gradient colors — matched to real gift card brand identity
const BRAND_COLORS: Record<string, [string, string]> = {
  // Gaming
  'xbox':                   ['#107C10','#0a5a0a'],
  'xbox live':              ['#107C10','#0a5a0a'],
  'xbox game pass':         ['#107C10','#0a5a0a'],
  'playstation':            ['#003087','#0059c2'],
  'playstation store':      ['#003087','#0059c2'],
  'psn':                    ['#003087','#0059c2'],
  'ps plus':                ['#003087','#0059c2'],
  'steam':                  ['#1b2838','#2a475e'],
  'nintendo':               ['#E4000F','#9e0000'],
  'nintendo eshop':         ['#E4000F','#9e0000'],
  'roblox':                 ['#E8002B','#8b0000'],
  'fortnite':               ['#1d1046','#9d4dca'],
  'fortnite v-bucks':       ['#1d1046','#9d4dca'],
  'minecraft':              ['#5c7a1f','#3a5012'],
  'league of legends':      ['#C89B3C','#785a28'],
  'valorant':               ['#FF4655','#8b0000'],
  'twitch':                 ['#6441a5','#9146FF'],
  'blizzard':               ['#148EFF','#0e6bbf'],
  'epic games':             ['#2d2d2d','#000000'],
  'razer gold':             ['#44D62C','#2a8a1a'],
  'apex legends':           ['#CD3333','#6b0000'],
  'call of duty':           ['#1a1a1a','#3d3d3d'],
  'pubg':                   ['#F5A623','#c07c0e'],
  'pubg mobile':            ['#F5A623','#c07c0e'],
  'genshin impact':         ['#4a90d9','#1a3a6b'],
  'mobile legends':         ['#1a1a2e','#c0392b'],
  'free fire':              ['#ff6b00','#c04e00'],
  'garena':                 ['#ff6b00','#c04e00'],
  'square enix':            ['#1a1a1a','#3d3d3d'],
  'runescape':              ['#8B4513','#5c2c0a'],
  'gamestop':               ['#E31A22','#9e0000'],
  'discord':                ['#5865F2','#404EED'],
  // Mega brands
  'amazon':                 ['#FF9900','#c97200'],
  'amazon us':              ['#FF9900','#c97200'],
  'apple':                  ['#555555','#1d1d1d'],
  'app store & itunes':     ['#555555','#1d1d1d'],
  'itunes':                 ['#555555','#1d1d1d'],
  'google play':            ['#01875f','#34a853'],
  'visa':                   ['#1A1F71','#0d1245'],
  'mastercard':             ['#EB001B','#c00014'],
  // Streaming
  'netflix':                ['#E50914','#8B0000'],
  'spotify':                ['#1DB954','#158a3e'],
  'hulu':                   ['#1CE783','#0fa35c'],
  'disney+':                ['#113CCF','#051a6e'],
  'disney plus':            ['#113CCF','#051a6e'],
  'crunchyroll':            ['#F47521','#c45810'],
  'paramount plus':         ['#0064FF','#0041a8'],
  'cbsi paramount plus':    ['#0064FF','#0041a8'],
  'tidal':                  ['#111111','#333333'],
  'showtime':               ['#CC0000','#8b0000'],
  'sling tv':               ['#1d6fe8','#0d4db5'],
  // Shopping — major retailers
  'walmart':                ['#0071CE','#004f94'],
  'target':                 ['#CC0000','#8b0000'],
  'best buy':               ['#0046BE','#003494'],
  'ebay':                   ['#E53238','#0064D2'],
  'nike':                   ['#111111','#333333'],
  'adidas':                 ['#000000','#1a1a1a'],
  'nordstrom':              ['#1a1a1a','#3d3d3d'],
  'sephora':                ['#111111','#333333'],
  'ulta':                   ['#000000','#1a1a1a'],
  'lululemon':              ['#CC0000','#8b0000'],
  'under armour':           ['#1a1a1a','#CC0000'],
  'columbia sportswear':    ['#1B3A6B','#CC0000'],
  'home depot':             ['#F96302','#c24c00'],
  'the home depot':         ['#F96302','#c24c00'],
  'gap':                    ['#0C4DA2','#083580'],
  'old navy':               ['#0C4DA2','#083580'],
  'banana republic':        ['#2d2d2d','#1a1a1a'],
  'athleta':                ['#1a1a1a','#2d2d2d'],
  'aerie':                  ['#c0687a','#8b3a4f'],
  'aeropostale':            ['#1a2a5e','#0d1a3d'],
  'macy\'s':                ['#E21A1A','#9e0000'],
  'kohl\'s':                ['#6b1a1a','#3d0a0a'],
  'jc penney':              ['#1a1a1a','#3d3d3d'],
  'tjx':                    ['#CC0000','#8b0000'],
  'marshalls':              ['#CC0000','#8b0000'],
  'home goods':             ['#CC0000','#8b0000'],
  'home sense':             ['#CC0000','#8b0000'],
  'sierra':                 ['#2d6b2d','#1a3a1a'],
  'wayfair':                ['#7B2D8B','#4a1a57'],
  'birch lane':             ['#5C3D2E','#3a2519'],
  'joss and main':          ['#2d2d2d','#1a1a1a'],
  'perigold':               ['#8B7355','#5c4a35'],
  'pottery barn':           ['#5C3D2E','#3a2519'],
  'west elm':               ['#1a1a1a','#2d2d2d'],
  'williams sonoma':        ['#8B0000','#5c0000'],
  'crate n\' kids':         ['#1a3a6b','#0d1f45'],
  'cb2':                    ['#1a1a1a','#000000'],
  'etsy':                   ['#F45800','#b83f00'],
  'sam\'s club':            ['#0071CE','#004f94'],
  'costco':                 ['#005DAA','#003d73'],
  'dicks sporting goods':   ['#003087','#CC0000'],
  'rei':                    ['#1B4C2A','#0d2a16'],
  'bass pro shop':          ['#1B4C2A','#0d2a16'],
  'autozone':               ['#E35205','#b03d00'],
  'advance auto parts':     ['#CC0000','#8b0000'],
  'chewy':                  ['#00A1E4','#007db3'],
  'Burlington':             ['#CC0000','#8b0000'],
  'burlington':             ['#CC0000','#8b0000'],
  'cvs':                    ['#CC0000','#8b0000'],
  'walgreens':              ['#E31837','#a50f25'],
  'kroger':                 ['#003087','#0057b3'],
  'albertsons':             ['#003DA5','#002070'],
  'safeway':                ['#CC0000','#0057b3'],
  'staples':                ['#CC0000','#8b0000'],
  'michaels':               ['#CC0000','#8b0000'],
  'dollar general':         ['#FFCC00','#c49a00'],
  'dsw':                    ['#000000','#1a1a1a'],
  'famous footwear':        ['#CC0000','#8b0000'],
  'finish line':            ['#003087','#0057b3'],
  'fanatics':               ['#CC0000','#8b0000'],
  'guitar center':          ['#CC0000','#8b0000'],
  'ann taylor':             ['#1a1a1a','#2d2d2d'],
  'chico\'s':               ['#1a1a1a','#2d2d2d'],
  'maurices':               ['#6b1a4a','#3d0a2a'],
  'belk':                   ['#1a1a1a','#2d2d2d'],
  "carter's":               ['#C41E3A','#8b0000'],
  'saks fifth avenue':      ['#1a1a1a','#000000'],
  'primark':                ['#003087','#0057b3'],
  'asos':                   ['#000000','#1a1a1a'],
  'nasty gal':              ['#1a1a1a','#000000'],
  'shein':                  ['#000000','#1a1a1a'],
  'guess':                  ['#1a1a1a','#000000'],
  'nautica':                ['#003087','#0057b3'],
  'l.l.bean':               ['#003087','#CC0000'],
  'stitch fix':             ['#45c5b1','#2d9d8e'],
  'thredup':                ['#3D9A4A','#2a6b33'],
  'build-a-bear':           ['#E31C79','#9e0050'],
  'yankee candle':          ['#CC0000','#8b0000'],
  'shutterfly':             ['#003087','#0057b3'],
  'mark & graham':          ['#1a1a1a','#2d2d2d'],
  // Food & dining — expanded
  'starbucks':              ['#00704A','#004d33'],
  'doordash':               ['#FF3008','#cc2500'],
  'uber':                   ['#000000','#1a1a1a'],
  'chipotle':               ['#A81612','#7a0f0d'],
  'mcdonalds':              ['#FFC72C','#DA291C'],
  "mcdonald's":             ['#FFC72C','#DA291C'],
  'subway':                 ['#009B48','#FFC600'],
  'taco bell':              ['#702082','#4b1559'],
  'dunkin':                 ['#FF6E0F','#DD1D21'],
  'papa johns':             ['#CC0000','#006747'],
  'domino\'s':              ['#006491','#CC0000'],
  'panera':                 ['#6B3A2A','#4a2519'],
  'krispy kreme':           ['#CC0000','#267c37'],
  'five guys':              ['#CC0000','#e8c800'],
  'buffalo wild wings':     ['#F4C31D','#CC0000'],
  'chilis':                 ['#CC0000','#8b0000'],
  'chick-fil-a':            ['#E31837','#a50f25'],
  'ihop':                   ['#003087','#CC0000'],
  'red robin':              ['#CC0000','#FFD700'],
  'cracker barrel':         ['#8B0000','#4a0000'],
  'texas roadhouse':        ['#CC0000','#8b0000'],
  'outback steakhouse':     ['#CC0000','#8b0000'],
  'red lobster':            ['#CC0000','#8b0000'],
  'the cheesecake factory': ['#8B0000','#5C3D2E'],
  'ruby tuesday':           ['#CC0000','#8b0000'],
  'panda express':          ['#CC0000','#1a1a1a'],
  'hooters':                ['#FF6600','#cc4400'],
  'sonic app':              ['#1B428A','#E31C1C'],
  'sonic':                  ['#1B428A','#E31C1C'],
  'jersey mike':            ['#CC0000','#8b0000'],
  'jamba juice':            ['#F5A623','#c07c0e'],
  'peet\'s coffee & tea':   ['#1B5A1E','#0d3a10'],
  'the coffee bean & tea leaf': ['#6B2D0A','#4a1e07'],
  'bob evans':              ['#CC0000','#8b0000'],
  'darden restaurants':     ['#1a3a6b','#CC0000'],
  'instacart':              ['#43B02A','#2d7a1c'],
  'hello fresh':            ['#9DC209','#6a8a00'],
  'home chef':              ['#FF6B35','#c04a1f'],
  'steak n\' shake':        ['#1a1a1a','#CC0000'],
  'baskin robbins':         ['#E31C79','#002CA6'],
  'cold stone creamery':    ['#003087','#0057b3'],
  'cinnabon':               ['#6B2D0A','#4a1e07'],
  'pinkberry':              ['#6EC531','#4a9a20'],
  'hard rock cafe':         ['#F5A623','#8B0000'],
  // Travel — expanded
  'airbnb':                 ['#FF5A5F','#e04045'],
  'airbnb us':              ['#FF5A5F','#e04045'],
  'delta airlines':         ['#003366','#cc0000'],
  'southwest airlines':     ['#304CB2','#F9B612'],
  'royal caribbean':        ['#003087','#0077C8'],
  'carnival cruises':       ['#CC0000','#003087'],
  'princess cruises':       ['#003087','#0057b3'],
  'celebrity cruises':      ['#003087','#1a1a1a'],
  'hilton':                 ['#004B87','#003058'],
  'hotels.com':             ['#CC0000','#8b0000'],
  'amtrak':                 ['#1a3a6b','#CC0000'],
  // Entertainment — expanded
  'amc':                    ['#1a1a1a','#cc0000'],
  'fandango':               ['#5C2483','#3a1657'],
  'stubhub':                ['#003168','#0057B8'],
  'regal entertainment':    ['#1a1a1a','#cc0000'],
  'cinemark':               ['#003087','#CC0000'],
  'topgolf':                ['#1a3a1a','#2d6b2d'],
  'dave & buster':          ['#CC0000','#1a1a1a'],
  'golden nugget casino':   ['#C8A951','#8B6914'],
  'sirius xm':              ['#003087','#0057b3'],
  // Outdoor / Auto
  'jiffy lube':             ['#F5A623','#E8001B'],
  'conoco':                 ['#CC0000','#E87722'],
  'chevron texaco':         ['#CC0000','#0057b3'],
  'sheetz':                 ['#CC0000','#8b0000'],
  // Sports / Recreation
  'nba store':              ['#1d428a','#CC0000'],
  'nfl shop':               ['#013369','#D50A0A'],
  'nhl shop':               ['#000000','#1a1a1a'],
  // Misc retail
  'groupon':                ['#53A318','#3a7210'],
  'lowe\'s':                ['#004990','#003060'],
  'lowes':                  ['#004990','#003060'],
  'ikea':                   ['#0051BA','#FFDA1A'],
  'vudu':                   ['#003087','#0057b3'],
  'paypal':                 ['#003087','#009cde'],
  'airalo':                 ['#6C63FF','#4a42cc'],}

const CATEGORY_COLORS: Record<string, [string, string]> = {
  gaming:        ['#2d1b69','#4B0082'],
  streaming:     ['#8B0000','#cc0000'],
  shopping:      ['#003d7a','#0057b3'],
  food:          ['#6B2D0A','#a84412'],
  travel:        ['#003366','#0057b3'],
  entertainment: ['#1a0033','#4B0082'],
  retail:        ['#1a2e1a','#2d4d2d'],
  payment:       ['#1a1a2e','#2d2d5a'],
  other:         ['#1a1a2e','#2d2d3d'],
}

function hashBrandColor(brand: string): [string, string] {
  let hash = 0
  for (let i = 0; i < brand.length; i++) {
    hash = brand.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = Math.abs(hash) % 360
  return [`hsl(${h}, 55%, 25%)`, `hsl(${h}, 65%, 15%)`]
}

function getBrandColors(brand: string, category: string): [string, string] {
  const key = brand.toLowerCase().trim()
  if (BRAND_COLORS[key]) return BRAND_COLORS[key]
  for (const [k, colors] of Object.entries(BRAND_COLORS)) {
    if (key.includes(k) || k.includes(key)) return colors
  }
  return CATEGORY_COLORS[category?.toLowerCase()] || hashBrandColor(brand)
}

// Gift card visual — 2-tier: Bitrefill artwork → gradient+initial
function GiftCardVisual({ card, height, extraClass, children }: {
  card: GiftCard
  height: string
  extraClass?: string
  children?: React.ReactNode
}) {
  const [from, to] = getBrandColors(card.brand, card.category)
  const initial = card.brand.replace(/[^a-zA-Z]/g, '')[0]?.toUpperCase() || '?'
  const [bitrefillError, setBitrefillError] = useState(false)
  const compact = height === 'h-24'

  const bitrefillUrl = !bitrefillError ? getBitrefillUrl(card.brand) : null

  return (
    <div
      className={`relative ${height} overflow-hidden ${extraClass || ''}`}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      {bitrefillUrl ? (
        <img
          src={bitrefillUrl}
          alt={card.brand}
          className="absolute inset-0 w-full h-full object-cover z-0"
          onError={() => setBitrefillError(true)}
        />
      ) : (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/30 pointer-events-none z-10" />
          <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent pointer-events-none z-10" />
          <div className="absolute pointer-events-none z-[1]" style={{ top: '-40%', right: '-25%', width: '65%', height: '130%', borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
          <div className="absolute pointer-events-none z-[1]" style={{ bottom: '-40%', left: '-20%', width: '55%', height: '110%', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <div className="absolute inset-0 flex items-center justify-center z-[2]">
            <span
              className="text-white/25 font-black select-none"
              style={{ fontSize: compact ? '3rem' : '5rem', lineHeight: 1 }}
            >
              {initial}
            </span>
          </div>
        </>
      )}

      <div className="relative z-20">{children}</div>
    </div>
  )
}

// Category-based gradient colors for card image backgrounds
const categoryGradients: Record<string, string> = {
  gaming: 'from-purple-900/80 via-purple-800/60 to-indigo-900/80',
  streaming: 'from-red-900/80 via-rose-800/60 to-pink-900/80',
  shopping: 'from-blue-900/80 via-cyan-800/60 to-teal-900/80',
  food: 'from-orange-900/80 via-amber-800/60 to-yellow-900/80',
  travel: 'from-sky-900/80 via-blue-800/60 to-indigo-900/80',
  entertainment: 'from-pink-900/80 via-fuchsia-800/60 to-purple-900/80',
  retail: 'from-emerald-900/80 via-green-800/60 to-teal-900/80',
  other: 'from-slate-800/80 via-slate-700/60 to-slate-800/80'
}

export default function GiftCardsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated } = useAuth()
  const { addItem, showAddedToCartPopup } = useCart()
  const { formatPrice, preferences } = usePreferences()

  // Get currency symbol based on preferences
  const currencySymbol = preferences?.currency?.symbol || '$'

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')


  // Fetch gift cards from API with React Query caching
  const { data: giftCardsData, isLoading: loading, isError, error } = useQuery({
    queryKey: ['gift-cards', selectedCategory, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedCategory) params.set('category', selectedCategory)
      if (searchQuery) params.set('search', searchQuery)

      const response = await fetch(`/api/gift-cards?${params.toString()}&limit=500`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch gift cards')
      }

      return { giftCards: data.giftCards as GiftCard[], categories: data.categories as Category[], total: data.total as number }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection
  })

  // Sort by popularity map, then fall back to API order (isFeatured → purchase_count → alpha)
  const giftCards = [...(giftCardsData?.giftCards ?? [])].sort((a, b) => {
    const pa = getBrandPriority(a.brand)
    const pb = getBrandPriority(b.brand)
    if (pa !== pb) return pa - pb
    // Both unknown: keep isFeatured first, then alpha
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1
    return a.brand.localeCompare(b.brand)
  })
  const categories = giftCardsData?.categories ?? []
  const totalCards = giftCardsData?.total ?? giftCards.length

  // Fetch markup settings with React Query caching
  const { data: markupPercent = 10 } = useQuery({
    queryKey: ['gift-card-markup'],
    queryFn: async () => {
      const res = await localApiFetch<any>('/settings/public?keys=giftCardMarkupPercent')
      if (res.success && res.data?.giftCardMarkupPercent) {
        return Number(res.data.giftCardMarkupPercent) || 10
      }
      return 10
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - markup settings rarely change
    gcTime: 30 * 60 * 1000, // 30 minutes
  })

  // Refs for auto-scroll
  const categoryScrollRef = useRef<HTMLDivElement>(null)

  // Pagination — 25 per page desktop, 15 mobile. Reset when category/search changes.
  const [visibleCount, setVisibleCount] = useState(25)
  useEffect(() => {
    const size = typeof window !== 'undefined' && window.innerWidth < 560 ? 20 : 25
    setVisibleCount(size)
  }, [selectedCategory, searchQuery])

  // Card state
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [selectedAmounts, setSelectedAmounts] = useState<Record<string, number>>({})
  const [customAmountInputs, setCustomAmountInputs] = useState<Record<string, string>>({})
  // Store original local currency amounts for display (avoids round-trip precision loss)
  const [confirmedLocalAmounts, setConfirmedLocalAmounts] = useState<Record<string, number>>({})
  // Modal state — which card's purchase modal is open
  const [modalCard, setModalCard] = useState<GiftCard | null>(null)

  // Payment state - card-specific to prevent error bleeding
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [processingPayment, setProcessingPayment] = useState<string | null>(null)
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>({})

  // Wallet state (exactly like virtual numbers page)
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [pendingWalletCheckout, setPendingWalletCheckout] = useState(false)
  const [pendingCard, setPendingCard] = useState<GiftCard | null>(null)

  // Helper to expand a card while closing any previously expanded card
  // Also clears ALL selections (both fixed and variable) when expanding
  const handleExpandCard = (cardId: string) => {
    // Clear ALL selections, custom inputs, local amounts, and errors when expanding any card
    setSelectedAmounts({})
    setConfirmedLocalAmounts({})
    setCustomAmountInputs({})
    setPaymentErrors({})
    setExpandedCard(cardId)
  }

  // Helper to get price range text with currency
  const getPriceRange = (card: GiftCard): string => {
    const currencyCode = preferences?.currency?.code || 'USD'
    if (card.denominations.length > 0) {
      const minUsd = Math.min(...card.denominations)
      const maxUsd = Math.max(...card.denominations)
      // Round min UP and max DOWN for clean whole numbers
      const minConverted = Math.ceil(convertPrice(minUsd, currencyCode))
      const maxConverted = Math.floor(convertPrice(maxUsd, currencyCode))
      if (minConverted === maxConverted) return `${currencySymbol}${minConverted.toLocaleString()}`
      return `${currencySymbol}${minConverted.toLocaleString()} - ${currencySymbol}${maxConverted.toLocaleString()}`
    }
    if (card.minCustomAmount && card.maxCustomAmount) {
      // Round min UP and max DOWN to stay within API bounds and show clean whole numbers
      const minConverted = Math.ceil(convertPrice(card.minCustomAmount, currencyCode))
      const maxConverted = Math.floor(convertPrice(card.maxCustomAmount, currencyCode))
      return `${currencySymbol}${minConverted.toLocaleString()} - ${currencySymbol}${maxConverted.toLocaleString()}`
    }
    return 'Variable'
  }

  // Fetch wallet balance
  const fetchWalletBalance = async () => {
    setLoadingBalance(true)
    try {
      const result = await getBalance()
      if (result.success && result.data) {
        setWalletBalance(result.data.balance || 0)
        return result.data.balance || 0
      }
      return null
    } catch (error) {
      console.error('Failed to fetch wallet balance:', error)
      return null
    } finally {
      setLoadingBalance(false)
    }
  }

  // Fetch wallet balance when authenticated
  useEffect(() => {
    if (isAuthenticated && walletBalance === null) {
      fetchWalletBalance()
    }
  }, [isAuthenticated])

  // Auto-scroll to selected category
  useEffect(() => {
    if (categoryScrollRef.current && selectedCategory) {
      const selectedEl = categoryScrollRef.current.querySelector(`[data-category="${selectedCategory}"]`)
      if (selectedEl) {
        selectedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
  }, [selectedCategory])

  // Calculate final price with markup and discount
  const calculateFinalPrice = useCallback((amount: number, discountPercent: number): number => {
    const withMarkup = amount * (1 + markupPercent / 100)
    const discount = amount * (discountPercent / 100)
    return withMarkup - discount
  }, [markupPercent])

  // Auto-continue purchase after login (like virtual numbers)
  useEffect(() => {
    if (pendingWalletCheckout && isAuthenticated && walletBalance !== null && pendingCard) {
      setPendingWalletCheckout(false)
      const card = pendingCard
      const amount = selectedAmounts[card.id]
      if (!amount) {
        setPendingCard(null)
        return
      }
      const finalPrice = calculateFinalPrice(amount, card.discountPercent)

      if (walletBalance >= finalPrice) {
        // Has enough balance, proceed with purchase
        processWalletPayment(card, amount, finalPrice)
      } else {
        // Show deposit modal immediately
        setShowDepositModal(true)
      }
    }
  }, [pendingWalletCheckout, isAuthenticated, walletBalance, pendingCard, calculateFinalPrice])

  const popularCards = giftCards.filter(card => card.isFeatured)

  // Get selected amount for a card
  const getSelectedAmount = (cardId: string): number | null => {
    return selectedAmounts[cardId] || null
  }

  // Handle custom amount confirmation
  const handleCustomAmountConfirm = (cardId: string, card: GiftCard) => {
    const value = parseFloat(customAmountInputs[cardId] || '')
    if (isNaN(value)) return

    const currencyCode = preferences?.currency?.code || 'USD'
    // Round min UP and max DOWN to stay within API bounds and avoid decimals
    const min = Math.ceil(convertPrice(card.minCustomAmount || 1, currencyCode))
    const max = Math.floor(convertPrice(card.maxCustomAmount || 1000, currencyCode))

    if (value >= min && value <= max) {
      // Convert from user's currency back to USD for storage
      // Round to 2 decimal places to avoid floating point imprecision
      const valueInUsd = Math.round((value / getExchangeRate(currencyCode)) * 100) / 100
      // Select this amount - clear ALL other cards first
      setSelectedAmounts({ [cardId]: valueInUsd })
      // Store original local currency value for display (avoids round-trip precision loss)
      setConfirmedLocalAmounts({ [cardId]: value })
      setExpandedCard(null) // Collapse after selection
      // Clear ALL errors and custom inputs
      setPaymentErrors({})
      setCustomAmountInputs({})
    }
  }

  // Add to cart handler
  const handleAddToCart = (card: GiftCard) => {
    const amount = getSelectedAmount(card.id)
    if (!amount) return

    const finalPrice = calculateFinalPrice(amount, card.discountPercent)

    // Use unique ID to prevent quantity stacking - each gift card should be a separate purchase
    const product = {
      id: `gc-${card.id}-${amount}-${Date.now()}`,
      name: `${card.brand} Gift Card (${formatPrice(amount)})`,
      slug: card.slug,
      description: card.description || '',
      price: finalPrice,
      rating: 5,
      reviewCount: 0,
      category: 'Gift Cards',
      icon: 'gift',
      iconColor: 'primary',
      tags: [card.brand, 'Gift Card'],
      productType: 'gift_card',
      product_type: 'gift_card',
      image: card.imageUrl || undefined, // For cart popup compatibility
      imageUrl: card.imageUrl || undefined,
      metadata: {
        productType: 'gift_card',
        gift_card_id: card.id,
        giftCardId: card.id,
        denomination: amount,
        brand: card.brand,
        imageUrl: card.imageUrl || undefined,
      }
    }

    addItem(product, 'standard', finalPrice)
    showAddedToCartPopup(product, finalPrice)
  }

  // Process wallet payment (actual API call)
  const processWalletPayment = async (card: GiftCard, amount: number, finalPrice: number) => {
    setProcessingPayment(card.id)
    // Clear error for this specific card
    setPaymentErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[card.id]
      return newErrors
    })

    try {
      const response = await localApiFetch<any>('/gift-cards/purchase', {
        method: 'POST',
        body: JSON.stringify({
          giftCardId: card.id,
          denomination: amount,
          paymentMethod: 'wallet'
        })
      })

      if (response.success) {
        // Refresh wallet balance
        await fetchWalletBalance()

        // Clear selection and redirect to library
        setSelectedAmounts(prev => {
          const newAmounts = { ...prev }
          delete newAmounts[card.id]
          return newAmounts
        })
        setPendingCard(null)
        router.push('/profile/library?tab=gift-cards&purchased=true')
      } else {
        setPaymentErrors(prev => ({ ...prev, [card.id]: response.error || 'Payment failed' }))
      }
    } catch (err: any) {
      console.error('Payment error:', err)
      setPaymentErrors(prev => ({ ...prev, [card.id]: err.message || 'Payment failed' }))
    } finally {
      setProcessingPayment(null)
    }
  }

  // Pay with wallet handler (exactly like virtual numbers handleInstantCheckout)
  const handlePayWithWallet = async (card: GiftCard) => {
    const amount = getSelectedAmount(card.id)
    if (!amount) return

    // Clear any previous error for this card
    setPaymentErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[card.id]
      return newErrors
    })

    // If not authenticated, show auth dialog (match virtual numbers pattern)
    if (!isAuthenticated) {
      setPendingCard(card)
      // Don't set pendingWalletCheckout here - let onSuccess set it
      // This matches virtual numbers handleInstantCheckout pattern
      setShowLoginModal(true)
      return
    }

    const finalPrice = calculateFinalPrice(amount, card.discountPercent)

    // Check wallet balance - fetch if null
    let currentBalance = walletBalance
    if (currentBalance === null) {
      setLoadingBalance(true)
      try {
        const result = await getBalance()
        if (result.success && result.data) {
          currentBalance = result.data.balance || 0
          setWalletBalance(currentBalance)
        } else {
          setPaymentErrors(prev => ({ ...prev, [card.id]: 'Failed to fetch wallet balance' }))
          setLoadingBalance(false)
          return
        }
      } catch {
        setPaymentErrors(prev => ({ ...prev, [card.id]: 'Failed to fetch wallet balance' }))
        setLoadingBalance(false)
        return
      }
      setLoadingBalance(false)
    }

    // If insufficient balance, show deposit modal immediately
    if (currentBalance === null || currentBalance < finalPrice) {
      setPendingCard(card)
      setShowDepositModal(true)
      return
    }

    // Process payment
    await processWalletPayment(card, amount, finalPrice)
  }

  return (
    <main className="max-w-container mx-auto px-4 lg:px-12 pb-24">
      {/* Auth Dialog */}
      <AuthDialog
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => {
          setShowLoginModal(false)
          setPendingWalletCheckout(true)  // Set BEFORE fetching balance - triggers auto-continue
          fetchWalletBalance()
        }}
        defaultTab="login"
      />

      {/* Deposit Modal */}
      <DepositModal
        isOpen={showDepositModal}
        onClose={async () => {
          setShowDepositModal(false)
          // Refresh balance after deposit modal closes
          const newBalance = await fetchWalletBalance()
          // Auto-complete purchase if now have enough balance (like virtual numbers)
          if (pendingCard && newBalance !== null) {
            const amount = selectedAmounts[pendingCard.id]
            if (amount) {
              const finalPrice = calculateFinalPrice(amount, pendingCard.discountPercent)
              if (newBalance >= finalPrice) {
                processWalletPayment(pendingCard, amount, finalPrice)
              }
            }
          }
        }}
      />

      {/* Breadcrumbs */}
      <div className="py-4">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Gift Cards' }
          ]}
          className="mb-0"
        />
      </div>

      {/* Sandbox Mode Banner */}
      <TestModeBanner />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#43D678]/20 via-[#43D678]/10 to-transparent rounded-2xl lg:rounded-3xl p-6 lg:p-12 mb-8 lg:mb-12">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl lg:text-4xl font-extrabold text-white mb-2">
              Digital Gift Cards
            </h1>
            <p className="text-slate-500 text-sm lg:text-base max-w-2xl">
              Instant delivery. Save up to 10% on popular brands. Perfect for gifting or personal use.
            </p>
          </div>

          {/* Wallet Balance - Desktop */}
          <WalletDisplay variant="desktop" />
        </header>
        {/* Mobile: wallet inside hero */}
        <div className="md:hidden mt-6">
          <WalletDisplay variant="mobile" />
        </div>
        {/* Tablet+: search inside hero */}
        <div className="hidden md:block mt-6 relative max-w-xl">
          <Icon name="search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search gift cards (Amazon, Steam, iTunes...)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-charcoal border border-border-dark rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
      </div>

      {/* Mobile: search below hero */}
      <div className="md:hidden relative max-w-xl mb-6">
        <Icon name="search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search gift cards (Amazon, Steam, iTunes...)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-charcoal border border-border-dark rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>
      {/* Tablet: wallet below hero */}
      <div className="hidden md:block lg:hidden mb-6">
        <WalletDisplay variant="mobile" />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
        </div>
      )}

      {/* Error State */}
      {isError && !loading && (
        <div className="text-center py-20">
          <Icon name="alert-circle" size={48} className="text-red-500 mx-auto mb-4" />
          <h3 className="text-white font-bold mb-2">Failed to load gift cards</h3>
          <p className="text-slate-500">{error instanceof Error ? error.message : 'An error occurred'}</p>
        </div>
      )}

      {/* Content */}
      {!loading && !isError && (
        <>
          {/* Popular Cards */}
          {!selectedCategory && !searchQuery && popularCards.length > 0 && (
            <div className="mb-12">
              <h2 className="text-xl font-bold text-white mb-6">Popular Gift Cards</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {popularCards.slice(0, 5).map((card) => (
                  <button
                    key={card.id}
                    onClick={() => {
                      // Scroll to the card in the main grid
                      document.getElementById(`card-${card.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }}
                    className="bg-charcoal border border-border-dark hover:border-primary/50 rounded-2xl overflow-hidden transition-all text-center group"
                  >
                    <GiftCardVisual card={card} height="h-24">
                      {card.discountPercent > 0 && (
                        <span className="absolute top-1.5 right-1.5 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg">
                          {card.discountPercent}%
                        </span>
                      )}
                    </GiftCardVisual>
                    <div className="p-3">
                      <h3 className="font-bold text-white text-sm line-clamp-1">{cleanBrandName(card.brand)}</h3>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category Filter */}
          <div className="mb-10">
            <div ref={categoryScrollRef} className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              <button
                data-category="all"
                onClick={() => setSelectedCategory(null)}
                className={`flex-shrink-0 px-5 py-3 rounded-xl font-bold text-sm transition-all ${
                  !selectedCategory
                    ? 'bg-primary text-black'
                    : 'bg-charcoal border border-border-dark text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              {[...categories]
                .sort((a, b) => {
                  const ai = CATEGORY_ORDER.indexOf(a.name.toLowerCase())
                  const bi = CATEGORY_ORDER.indexOf(b.name.toLowerCase())
                  if (ai === -1 && bi === -1) return a.name.localeCompare(b.name)
                  if (ai === -1) return 1
                  if (bi === -1) return -1
                  return ai - bi
                })
                .map((category) => {
                  const key = category.name.toLowerCase()
                  const displayName = CATEGORY_DISPLAY_NAME[key] || category.name
                  const icon = categoryIcons[key] || 'gift'
                  const isActive = selectedCategory === category.name ||
                    // Treat "Other" and "Payment" as the same tab
                    (selectedCategory?.toLowerCase() === 'other' && key === 'payment') ||
                    (selectedCategory?.toLowerCase() === 'payment' && key === 'other')
                  return (
                    <button
                      key={category.name}
                      data-category={category.name}
                      onClick={() => setSelectedCategory(selectedCategory === category.name ? null : category.name)}
                      className={`flex-shrink-0 px-5 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                        isActive
                          ? 'bg-primary text-black'
                          : 'bg-charcoal border border-border-dark text-slate-400 hover:text-white'
                      }`}
                    >
                      <Icon name={icon} size={16} />
                      {displayName}
                    </button>
                  )
                })}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {selectedCategory
                  ? `${selectedCategory} Gift Cards`
                  : 'All Gift Cards'}
              </h2>
              <span className="text-slate-500 text-sm">{totalCards} cards available</span>
            </div>

            {giftCards.length === 0 ? (
              <div className="text-center py-16 bg-charcoal border border-border-dark rounded-2xl">
                <Icon name="gift" size={48} className="text-slate-600 mx-auto mb-4" />
                <h3 className="text-white font-bold mb-2">No gift cards found</h3>
                <p className="text-slate-500">Try adjusting your search or filters</p>
              </div>
            ) : (
              <>
              <div className="grid grid-cols-2 min-[700px]:grid-cols-3 min-[960px]:grid-cols-4 gap-6 items-start">
                {giftCards.slice(0, visibleCount).map((card) => {
                  const selectedAmount = getSelectedAmount(card.id)
                  const hasSelection = selectedAmount !== null
                  const isVariableOnly = card.denominations.length === 0 && (card.minCustomAmount || card.maxCustomAmount)

                  const openModal = (preSelectAmount?: number) => {
                    if (preSelectAmount !== undefined) {
                      setSelectedAmounts({ [card.id]: preSelectAmount })
                      setConfirmedLocalAmounts({})
                      setPaymentErrors({})
                      setCustomAmountInputs({})
                    }
                    setModalCard(card)
                  }

                  return (
                    <div
                      id={`card-${card.id}`}
                      key={card.id}
                      className={`bg-charcoal border rounded-2xl overflow-hidden transition-all cursor-pointer group ${
                        hasSelection
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-border-dark hover:border-primary/50'
                      }`}
                      onClick={() => openModal()}
                    >
                      {/* Card Image Header */}
                      <GiftCardVisual card={card} height="h-40">
                        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                          {card.discountPercent > 0 && (
                            <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-md shadow-lg">
                              {card.discountPercent}% OFF
                            </span>
                          )}
                          {!card.inStock && (
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-md shadow-lg">
                              Out of Stock
                            </span>
                          )}
                        </div>
                      </GiftCardVisual>

                      {/* Card Content */}
                      <div className="p-3">
                        <h3 className="font-bold text-white text-lg mt-2 mb-0.5 line-clamp-1">{cleanBrandName(card.brand)}</h3>
                        <p className="text-sm text-primary font-medium">{getPriceRange(card)}</p>

                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Load More */}
              {giftCards.length > visibleCount && (
                <div className="mt-10 flex flex-col items-center gap-3">
                  <p className="text-slate-500 text-sm">Showing {visibleCount} of {giftCards.length}</p>
                  <div className="w-48 h-1 bg-border-dark rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min((visibleCount / giftCards.length) * 100, 100)}%` }} />
                  </div>
                  <button
                    onClick={() => setVisibleCount(v => v + (typeof window !== 'undefined' && window.innerWidth < 560 ? 20 : 25))}
                    className="mt-2 px-8 py-3 bg-charcoal border border-border-dark rounded-xl text-white font-semibold hover:border-primary/50 transition-colors"
                  >
                    Load More
                  </button>
                </div>
              )}
              </>
            )}
          </div>

        </>
      )}

      {/* ── Gift Card Purchase Modal ── */}
      {modalCard && (() => {
        const card = modalCard
        const selectedAmount = getSelectedAmount(card.id)
        const hasSelection = selectedAmount !== null
        const isVariableOnly = card.denominations.length === 0 && (card.minCustomAmount || card.maxCustomAmount)
        const finalPrice = hasSelection ? calculateFinalPrice(selectedAmount, card.discountPercent) : 0
        const discountAmount = hasSelection ? selectedAmount * (card.discountPercent / 100) : 0

        const inputValue = customAmountInputs[card.id] || ''
        const parsedValue = parseFloat(inputValue)
        const currencyCode = preferences?.currency?.code || 'USD'
        const minUsd = card.minCustomAmount || 1
        const maxUsd = card.maxCustomAmount || 1000
        const min = Math.ceil(convertPrice(minUsd, currencyCode))
        const max = Math.floor(convertPrice(maxUsd, currencyCode))
        const isValidInput = !isNaN(parsedValue) && parsedValue >= min && parsedValue <= max

        const closeModal = () => {
          setModalCard(null)
          setExpandedCard(null)
        }

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={closeModal}
          >
            <div
              className="bg-[#1a1a1a] border border-border-dark rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal image header */}
              <GiftCardVisual card={card} height="h-36" extraClass="rounded-t-2xl">
                <button onClick={closeModal} className="absolute top-3 right-3 p-1.5 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors">
                  <Icon name="x" size={16} />
                </button>
                {card.discountPercent > 0 && (
                  <span className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-md">
                    {card.discountPercent}% OFF
                  </span>
                )}
              </GiftCardVisual>

              <div className="p-5">
                <h3 className="font-bold text-white text-lg mb-0.5">{cleanBrandName(card.brand)}</h3>
                <p className="text-xs text-slate-500 mb-4">{card.category} · {getPriceRange(card)}</p>

                {/* Amount selection */}
                {card.denominations.length > 0 ? (
                  <div className="mb-4">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Select Amount</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {card.denominations.map((amount) => {
                        const displayAmount = Math.round(convertPrice(amount, currencyCode))
                        return (
                          <button
                            key={amount}
                            onClick={() => {
                              if (selectedAmount === amount) {
                                setSelectedAmounts({})
                                setConfirmedLocalAmounts({})
                              } else {
                                setSelectedAmounts({ [card.id]: amount })
                                setConfirmedLocalAmounts({})
                                setPaymentErrors({})
                                setCustomAmountInputs({})
                              }
                            }}
                            className={`px-3 py-3 rounded-xl text-sm font-bold transition-all text-center ${
                              selectedAmount === amount
                                ? 'bg-primary text-black ring-2 ring-primary/30'
                                : 'bg-surface-dark border border-border-dark text-white hover:border-primary/50'
                            }`}
                          >
                            {currencySymbol}{displayAmount.toLocaleString()}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : isVariableOnly ? (
                  <div className="mb-4">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Enter Amount</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currencySymbol}</span>
                      <input
                        type="number"
                        min={min}
                        max={max}
                        placeholder={`${min.toLocaleString()} – ${max.toLocaleString()}`}
                        value={inputValue}
                        onChange={(e) => setCustomAmountInputs(prev => ({ ...prev, [card.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (['e', 'E', '+', '-'].includes(e.key)) { e.preventDefault(); return }
                          if (e.key === 'Enter' && isValidInput) { handleCustomAmountConfirm(card.id, card) }
                          if (e.key === 'Escape') { closeModal() }
                        }}
                        autoFocus
                        className="w-full pl-8 pr-4 py-3 bg-surface-dark border border-border-dark rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary focus:border-primary text-sm font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Min {currencySymbol}{min.toLocaleString()} · Max {currencySymbol}{max.toLocaleString()}
                    </p>
                    {isValidInput && (
                      <button
                        onClick={() => handleCustomAmountConfirm(card.id, card)}
                        className="mt-3 w-full py-2.5 rounded-xl bg-surface-dark border border-primary text-primary font-bold text-sm hover:bg-primary/10 transition-colors"
                      >
                        Confirm {currencySymbol}{parsedValue.toLocaleString()}
                      </button>
                    )}
                  </div>
                ) : null}

                {/* Price summary */}
                {hasSelection && (
                  <>
                    <div className="mb-4 p-3 bg-surface-dark rounded-xl space-y-2">
                      {card.discountPercent > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Discount ({card.discountPercent}%)</span>
                          <span className="text-green-400">-{formatPrice(discountAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-bold">You Pay</span>
                        <span className="text-white font-extrabold">{formatPrice(finalPrice)}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={() => handlePayWithWallet(card)}
                        disabled={processingPayment === card.id || loadingBalance}
                        className="w-full font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 bg-primary text-black hover:brightness-105 disabled:opacity-50"
                      >
                        {processingPayment === card.id ? (
                          <><div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" /><span>Processing...</span></>
                        ) : loadingBalance ? (
                          <><div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" /><span>Checking Balance...</span></>
                        ) : (
                          <><Icon name="wallet" size={16} /><span>Pay {formatPrice(finalPrice)} with Wallet</span></>
                        )}
                      </button>
                      <button
                        onClick={() => { handleAddToCart(card); closeModal() }}
                        className="w-full font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 bg-surface-dark border border-border-dark text-white hover:border-primary/50"
                      >
                        <Icon name="cart" size={16} />
                        <span>Add to Cart</span>
                      </button>
                    </div>

                    {paymentErrors[card.id] && processingPayment !== card.id && (
                      <p className="mt-2 text-xs text-red-400 text-center">{paymentErrors[card.id]}</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </main>
  )
}
