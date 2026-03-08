'use client'

import { useState, useEffect } from 'react'

interface ServiceLogoProps {
  name: string
  size?: number
  className?: string
}

// Map service names to their domains for logo fetching
const SERVICE_DOMAINS: Record<string, string> = {
  // Social & Messaging
  whatsapp: 'whatsapp.com',
  telegram: 'telegram.org',
  facebook: 'facebook.com',
  instagram: 'instagram.com',
  twitter: 'twitter.com',
  x: 'x.com',
  tiktok: 'tiktok.com',
  discord: 'discord.com',
  snapchat: 'snapchat.com',
  linkedin: 'linkedin.com',
  reddit: 'reddit.com',
  pinterest: 'pinterest.com',
  youtube: 'youtube.com',
  twitch: 'twitch.tv',
  clubhouse: 'clubhouse.com',
  threads: 'threads.net',
  mastodon: 'mastodon.social',
  bluesky: 'bsky.app',
  vk: 'vk.com',
  odnoklassniki: 'ok.ru',
  weibo: 'weibo.com',
  qq: 'qq.com',
  wechat: 'wechat.com',
  kakaotalk: 'kakaocorp.com',
  line: 'line.me',
  viber: 'viber.com',
  signal: 'signal.org',
  skype: 'skype.com',
  imo: 'imo.im',
  zalo: 'zalo.me',
  likee: 'likee.video',
  bigo: 'bigo.tv',
  yalla: 'yalla.live',

  // Email & Productivity
  google: 'google.com',
  gmail: 'gmail.com',
  outlook: 'outlook.com',
  yahoo: 'yahoo.com',
  mailru: 'mail.ru',
  protonmail: 'proton.me',
  proton: 'proton.me',
  tutanota: 'tutanota.com',
  icloud: 'icloud.com',
  fastmail: 'fastmail.com',
  zoho: 'zoho.com',
  microsoft: 'microsoft.com',
  office365: 'office.com',

  // Tech & Dev
  github: 'github.com',
  gitlab: 'gitlab.com',
  bitbucket: 'bitbucket.org',
  firebase: 'firebase.google.com',
  aws: 'aws.amazon.com',
  azure: 'azure.microsoft.com',
  digitalocean: 'digitalocean.com',
  heroku: 'heroku.com',
  vercel: 'vercel.com',
  netlify: 'netlify.com',
  cloudflare: 'cloudflare.com',
  docker: 'docker.com',
  npm: 'npmjs.com',
  stackoverflow: 'stackoverflow.com',
  atlassian: 'atlassian.com',
  jira: 'jira.com',
  confluence: 'confluence.com',

  // Design & Creative
  adobe: 'adobe.com',
  canva: 'canva.com',
  figma: 'figma.com',
  sketch: 'sketch.com',
  invision: 'invisionapp.com',
  behance: 'behance.net',
  dribbble: 'dribbble.com',

  // Productivity & Collaboration
  notion: 'notion.so',
  trello: 'trello.com',
  asana: 'asana.com',
  monday: 'monday.com',
  clickup: 'clickup.com',
  slack: 'slack.com',
  zoom: 'zoom.us',
  teams: 'teams.microsoft.com',
  meet: 'meet.google.com',
  dropbox: 'dropbox.com',
  box: 'box.com',
  evernote: 'evernote.com',
  todoist: 'todoist.com',
  airtable: 'airtable.com',

  // Streaming & Entertainment
  netflix: 'netflix.com',
  spotify: 'spotify.com',
  hulu: 'hulu.com',
  hbo: 'hbomax.com',
  hbomax: 'hbomax.com',
  disney: 'disney.com',
  disneyplus: 'disneyplus.com',
  primevideo: 'primevideo.com',
  appletv: 'tv.apple.com',
  peacock: 'peacocktv.com',
  paramount: 'paramountplus.com',
  crunchyroll: 'crunchyroll.com',
  funimation: 'funimation.com',
  deezer: 'deezer.com',
  soundcloud: 'soundcloud.com',
  pandora: 'pandora.com',
  tidal: 'tidal.com',

  // Gaming
  steam: 'steampowered.com',
  epic: 'epicgames.com',
  epicgames: 'epicgames.com',
  origin: 'origin.com',
  ea: 'ea.com',
  ubisoft: 'ubisoft.com',
  blizzard: 'blizzard.com',
  battlenet: 'battle.net',
  roblox: 'roblox.com',
  minecraft: 'minecraft.net',
  playstation: 'playstation.com',
  xbox: 'xbox.com',
  nintendo: 'nintendo.com',
  faceit: 'faceit.com',
  esea: 'esea.net',
  esportal: 'esportal.com',

  // E-commerce & Retail
  amazon: 'amazon.com',
  ebay: 'ebay.com',
  etsy: 'etsy.com',
  shopify: 'shopify.com',
  walmart: 'walmart.com',
  target: 'target.com',
  bestbuy: 'bestbuy.com',
  aliexpress: 'aliexpress.com',
  alibaba: 'alibaba.com',
  wish: 'wish.com',
  shein: 'shein.com',
  shopee: 'shopee.com',
  lazada: 'lazada.com',
  mercadolibre: 'mercadolibre.com',
  flipkart: 'flipkart.com',
  wildberries: 'wildberries.ru',
  ozon: 'ozon.ru',
  avito: 'avito.ru',
  olx: 'olx.com',
  craigslist: 'craigslist.org',
  wayfair: 'wayfair.com',
  overstock: 'overstock.com',
  newegg: 'newegg.com',
  rakuten: 'rakuten.com',

  // Freelance & Work
  fiverr: 'fiverr.com',
  upwork: 'upwork.com',
  freelancer: 'freelancer.com',
  toptal: 'toptal.com',
  99designs: '99designs.com',
  guru: 'guru.com',
  peopleperhour: 'peopleperhour.com',

  // Finance & Payments
  paypal: 'paypal.com',
  stripe: 'stripe.com',
  venmo: 'venmo.com',
  cashapp: 'cash.app',
  zelle: 'zellepay.com',
  wise: 'wise.com',
  transferwise: 'wise.com',
  revolut: 'revolut.com',
  n26: 'n26.com',
  chime: 'chime.com',

  // Crypto & Trading
  coinbase: 'coinbase.com',
  binance: 'binance.com',
  kraken: 'kraken.com',
  robinhood: 'robinhood.com',
  etrade: 'etrade.com',
  fidelity: 'fidelity.com',
  schwab: 'schwab.com',
  webull: 'webull.com',
  tradingview: 'tradingview.com',
  metatrader: 'metatrader4.com',
  fbs: 'fbs.com',
  exness: 'exness.com',
  xm: 'xm.com',
  iqoption: 'iqoption.com',
  expertoption: 'expertoption.com',
  olymptrade: 'olymptrade.com',
  pocket: 'pocketoption.com',
  pocketoption: 'pocketoption.com',
  quotex: 'quotex.io',
  deriv: 'deriv.com',
  binary: 'binary.com',

  // Dating
  tinder: 'tinder.com',
  bumble: 'bumble.com',
  hinge: 'hinge.co',
  match: 'match.com',
  okcupid: 'okcupid.com',
  pof: 'pof.com',
  badoo: 'badoo.com',
  happn: 'happn.com',
  coffee: 'coffeemeetsbagel.com',
  zoosk: 'zoosk.com',
  eharmony: 'eharmony.com',

  // Food Delivery
  doordash: 'doordash.com',
  grubhub: 'grubhub.com',
  ubereats: 'ubereats.com',
  instacart: 'instacart.com',
  postmates: 'postmates.com',
  seamless: 'seamless.com',
  deliveroo: 'deliveroo.com',
  wolt: 'wolt.com',
  glovo: 'glovoapp.com',
  rappi: 'rappi.com',
  swiggy: 'swiggy.com',
  zomato: 'zomato.com',
  foodpanda: 'foodpanda.com',
  fantuan: 'fantuan.ca',

  // Ride & Transport
  uber: 'uber.com',
  lyft: 'lyft.com',
  bolt: 'bolt.eu',
  didi: 'didiglobal.com',
  careem: 'careem.com',
  grab: 'grab.com',
  gojek: 'gojek.com',
  ola: 'olacabs.com',
  curb: 'gocurb.com',
  lime: 'li.me',
  bird: 'bird.co',

  // Travel & Hotels
  airbnb: 'airbnb.com',
  booking: 'booking.com',
  'booking.com': 'booking.com',
  expedia: 'expedia.com',
  hotels: 'hotels.com',
  vrbo: 'vrbo.com',
  agoda: 'agoda.com',
  tripadvisor: 'tripadvisor.com',
  kayak: 'kayak.com',
  skyscanner: 'skyscanner.com',
  priceline: 'priceline.com',
  hopper: 'hopper.com',

  // Fashion & Lifestyle
  nike: 'nike.com',
  adidas: 'adidas.com',
  zara: 'zara.com',
  hm: 'hm.com',
  uniqlo: 'uniqlo.com',
  asos: 'asos.com',
  nordstrom: 'nordstrom.com',
  macys: 'macys.com',
  sephora: 'sephora.com',
  ulta: 'ulta.com',

  // Food & Coffee
  starbucks: 'starbucks.com',
  dunkin: 'dunkindonuts.com',
  mcdonalds: 'mcdonalds.com',
  burgerking: 'bk.com',
  wendys: 'wendys.com',
  chipotle: 'chipotle.com',
  subway: 'subway.com',
  dominos: 'dominos.com',
  pizzahut: 'pizzahut.com',
  papajohns: 'papajohns.com',

  // Business & Telecom
  apple: 'apple.com',
  samsung: 'samsung.com',
  huawei: 'huawei.com',
  xiaomi: 'mi.com',
  att: 'att.com',
  verizon: 'verizon.com',
  tmobile: 't-mobile.com',
  sprint: 'sprint.com',
  vodafone: 'vodafone.com',

  // Misc Services
  yelp: 'yelp.com',
  yandex: 'yandex.com',
  naver: 'naver.com',
  baidu: 'baidu.com',
  momo: 'momo.vn',
  yohoho: 'yohoho.io',
  yippi: 'yippi.biz',

  // News & Media
  nytimes: 'nytimes.com',
  washingtonpost: 'washingtonpost.com',
  bbc: 'bbc.com',
  cnn: 'cnn.com',
  forbes: 'forbes.com',
  bloomberg: 'bloomberg.com',
  reuters: 'reuters.com',
  medium: 'medium.com',
  substack: 'substack.com',

  // Health & Fitness
  myfitnesspal: 'myfitnesspal.com',
  strava: 'strava.com',
  fitbit: 'fitbit.com',
  peloton: 'onepeloton.com',
  headspace: 'headspace.com',
  calm: 'calm.com',
  noom: 'noom.com',

  // Education
  coursera: 'coursera.org',
  udemy: 'udemy.com',
  udacity: 'udacity.com',
  skillshare: 'skillshare.com',
  linkedin: 'linkedin.com',
  duolingo: 'duolingo.com',
  khan: 'khanacademy.org',
  edx: 'edx.org',

  // Gift Cards & Rewards
  egifter: 'egifter.com',
  giftcards: 'giftcards.com',
  fetchrewards: 'fetchrewards.com',
  ibotta: 'ibotta.com',
  rakuten: 'rakuten.com',
  swagbucks: 'swagbucks.com',
  erewards: 'e-rewards.com',

  // Gaming Platforms & Stores
  eneba: 'eneba.com',
  g2a: 'g2a.com',
  kinguin: 'kinguin.net',
  fanatical: 'fanatical.com',
  humblebundle: 'humblebundle.com',
  gog: 'gog.com',
  greenmangaming: 'greenmangaming.com',
  epicnpc: 'epicnpc.com',

  // Russian Services
  faberlic: 'faberlic.com',
  wildberries: 'wildberries.ru',

  // Asian Services
  shopee: 'shopee.com',
  tokopedia: 'tokopedia.com',
  bukalapak: 'bukalapak.com',
  jdcom: 'jd.com',
  pinduoduo: 'pinduoduo.com',

  // Latin America
  mercadopago: 'mercadopago.com',
  nubank: 'nubank.com.br',
  picpay: 'picpay.com',

  // Misc popular services from OTP providers
  finishline: 'finishline.com',
  fedex: 'fedex.com',
  ups: 'ups.com',
  usps: 'usps.com',
  dhl: 'dhl.com',

  // Add variations and common misspellings
  insta: 'instagram.com',
  fb: 'facebook.com',
  yt: 'youtube.com',
  goog: 'google.com',
  googl: 'google.com',
  amzn: 'amazon.com',
  msft: 'microsoft.com',
  appl: 'apple.com',
}

// Get first letter as fallback
function getInitial(name: string): string {
  return name.charAt(0).toUpperCase()
}

// Generate a consistent color based on the service name
function getColorFromName(name: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8B500', '#00CED1', '#FF69B4', '#32CD32', '#FF4500',
    '#9370DB', '#20B2AA', '#FFD700', '#00FA9A', '#DC143C',
  ]

  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length]
}

function getServiceDomain(serviceName: string): string | null {
  const normalized = serviceName.toLowerCase().replace(/[^a-z0-9]/g, '')
  const withDots = serviceName.toLowerCase().replace(/\s+/g, '')

  // 1. Direct match in our known domains
  if (SERVICE_DOMAINS[normalized]) {
    return SERVICE_DOMAINS[normalized]
  }

  // 2. Try with dots preserved (e.g., "booking.com")
  if (SERVICE_DOMAINS[withDots]) {
    return SERVICE_DOMAINS[withDots]
  }

  // 3. Try partial match for compound names (e.g., "Google Firebase" → "firebase")
  for (const [key, domain] of Object.entries(SERVICE_DOMAINS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return domain
    }
  }

  // 4. FALLBACK: Try to construct a domain from the service name
  // This handles services not in our list by trying common domain patterns
  // Clean the name: remove spaces, special chars, keep alphanumeric
  const cleanName = serviceName.toLowerCase().replace(/[^a-z0-9]/g, '')

  if (cleanName.length >= 2) {
    // Return a guessed domain - the logo fetcher will try Clearbit, Google, DuckDuckGo
    // Most legitimate services have <name>.com domains
    return `${cleanName}.com`
  }

  return null
}

export default function ServiceLogo({ name, size = 32, className = '' }: ServiceLogoProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)

  const domain = getServiceDomain(name)
  const initial = getInitial(name)
  const bgColor = getColorFromName(name)

  useEffect(() => {
    // Reset state when name changes
    setLoadFailed(false)
    setLoadAttempt(0)

    if (domain) {
      // Start with Clearbit
      setImgSrc(`https://logo.clearbit.com/${domain}`)
    } else {
      // No known domain, use letter avatar
      setLoadFailed(true)
    }
  }, [name, domain])

  const handleError = () => {
    if (loadAttempt === 0 && domain) {
      // First failure (Clearbit), try Google favicon
      setLoadAttempt(1)
      setImgSrc(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`)
    } else if (loadAttempt === 1 && domain) {
      // Second failure (Google favicon), try DuckDuckGo
      setLoadAttempt(2)
      setImgSrc(`https://icons.duckduckgo.com/ip3/${domain}.ico`)
    } else {
      // All attempts failed, show letter avatar
      setLoadFailed(true)
    }
  }

  // Show letter avatar if no domain or all load attempts failed
  if (loadFailed || !imgSrc) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg font-bold text-white ${className}`}
        style={{
          width: size,
          height: size,
          backgroundColor: bgColor,
          fontSize: size * 0.5,
        }}
      >
        {initial}
      </div>
    )
  }

  return (
    <div
      className={`relative bg-white rounded-lg overflow-hidden flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgSrc}
        alt={name}
        width={size - 4}
        height={size - 4}
        className="object-contain"
        onError={handleError}
        loading="lazy"
        style={{ maxWidth: size - 4, maxHeight: size - 4 }}
      />
    </div>
  )
}
