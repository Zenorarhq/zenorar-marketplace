'use client'

import { useState, useEffect } from 'react'

interface ServiceLogoProps {
  name: string
  size?: number
  className?: string
}

// Map service names to their domains for logo fetching
const SERVICE_DOMAINS: Record<string, string> = {
  whatsapp: 'whatsapp.com',
  telegram: 'telegram.org',
  google: 'google.com',
  gmail: 'gmail.com',
  facebook: 'facebook.com',
  instagram: 'instagram.com',
  twitter: 'twitter.com',
  x: 'x.com',
  tiktok: 'tiktok.com',
  discord: 'discord.com',
  snapchat: 'snapchat.com',
  uber: 'uber.com',
  amazon: 'amazon.com',
  netflix: 'netflix.com',
  spotify: 'spotify.com',
  paypal: 'paypal.com',
  microsoft: 'microsoft.com',
  apple: 'apple.com',
  linkedin: 'linkedin.com',
  yahoo: 'yahoo.com',
  steam: 'steampowered.com',
  twitch: 'twitch.tv',
  reddit: 'reddit.com',
  pinterest: 'pinterest.com',
  youtube: 'youtube.com',
  tinder: 'tinder.com',
  bumble: 'bumble.com',
  hinge: 'hinge.co',
  doordash: 'doordash.com',
  grubhub: 'grubhub.com',
  ubereats: 'ubereats.com',
  instacart: 'instacart.com',
  postmates: 'postmates.com',
  lyft: 'lyft.com',
  airbnb: 'airbnb.com',
  booking: 'booking.com',
  'booking.com': 'booking.com',
  expedia: 'expedia.com',
  hotels: 'hotels.com',
  vrbo: 'vrbo.com',
  venmo: 'venmo.com',
  cashapp: 'cash.app',
  zelle: 'zellepay.com',
  coinbase: 'coinbase.com',
  binance: 'binance.com',
  kraken: 'kraken.com',
  robinhood: 'robinhood.com',
  dropbox: 'dropbox.com',
  slack: 'slack.com',
  zoom: 'zoom.us',
  skype: 'skype.com',
  signal: 'signal.org',
  viber: 'viber.com',
  line: 'line.me',
  wechat: 'wechat.com',
  weibo: 'weibo.com',
  qq: 'qq.com',
  kakaotalk: 'kakaocorp.com',
  naver: 'naver.com',
  shopify: 'shopify.com',
  ebay: 'ebay.com',
  etsy: 'etsy.com',
  walmart: 'walmart.com',
  target: 'target.com',
  bestbuy: 'bestbuy.com',
  aliexpress: 'aliexpress.com',
  alibaba: 'alibaba.com',
  wish: 'wish.com',
  shein: 'shein.com',
  nike: 'nike.com',
  adidas: 'adidas.com',
  hulu: 'hulu.com',
  hbo: 'hbomax.com',
  disney: 'disney.com',
  disneyplus: 'disneyplus.com',
  adobe: 'adobe.com',
  canva: 'canva.com',
  figma: 'figma.com',
  notion: 'notion.so',
  trello: 'trello.com',
  github: 'github.com',
  gitlab: 'gitlab.com',
  stripe: 'stripe.com',
  shopee: 'shopee.com',
  grab: 'grab.com',
  gojek: 'gojek.com',
  olx: 'olx.com',
  agoda: 'agoda.com',
  yelp: 'yelp.com',
  starbucks: 'starbucks.com',
  yandex: 'yandex.com',
  vk: 'vk.com',
  odnoklassniki: 'ok.ru',
  mailru: 'mail.ru',
  wolt: 'wolt.com',
  deliveroo: 'deliveroo.com',
  glovo: 'glovoapp.com',
  bolt: 'bolt.eu',
  didi: 'didiglobal.com',
  careem: 'careem.com',
  rappi: 'rappi.com',
  mercadolibre: 'mercadolibre.com',
  wildberries: 'wildberries.ru',
  ozon: 'ozon.ru',
  avito: 'avito.ru',
  protonmail: 'proton.me',
  tutanota: 'tutanota.com',
  outlook: 'outlook.com',
  icloud: 'icloud.com',
  yohoho: 'yohoho.io',
  yalla: 'yalla.live',
  yippi: 'yippi.biz',
  imo: 'imo.im',
  likee: 'likee.video',
  bigo: 'bigo.tv',
  momo: 'momo.vn',
  zalo: 'zalo.me',
  clubhouse: 'clubhouse.com',
  threads: 'threads.net',
  mastodon: 'mastodon.social',
  bluesky: 'bsky.app',
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

  // Direct match
  if (SERVICE_DOMAINS[normalized]) {
    return SERVICE_DOMAINS[normalized]
  }

  // Try original name with dots preserved (e.g., "booking.com")
  const withDots = serviceName.toLowerCase().replace(/\s+/g, '')
  if (SERVICE_DOMAINS[withDots]) {
    return SERVICE_DOMAINS[withDots]
  }

  // Try partial match - but be strict about it
  for (const [key, domain] of Object.entries(SERVICE_DOMAINS)) {
    if (normalized === key) {
      return domain
    }
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
