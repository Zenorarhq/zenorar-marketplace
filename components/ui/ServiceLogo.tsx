'use client'

import { useState } from 'react'
import Image from 'next/image'

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
  etrade: 'etrade.com',
  fidelity: 'fidelity.com',
  schwab: 'schwab.com',
  chase: 'chase.com',
  bankofamerica: 'bankofamerica.com',
  wellsfargo: 'wellsfargo.com',
  citibank: 'citi.com',
  capitalone: 'capitalone.com',
  amex: 'americanexpress.com',
  discover: 'discover.com',
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
  costco: 'costco.com',
  aliexpress: 'aliexpress.com',
  alibaba: 'alibaba.com',
  wish: 'wish.com',
  shein: 'shein.com',
  nike: 'nike.com',
  adidas: 'adidas.com',
  hulu: 'hulu.com',
  hbo: 'hbo.com',
  disney: 'disney.com',
  disneyplus: 'disneyplus.com',
  primevideo: 'primevideo.com',
  paramount: 'paramountplus.com',
  peacock: 'peacocktv.com',
  adobe: 'adobe.com',
  canva: 'canva.com',
  figma: 'figma.com',
  notion: 'notion.so',
  trello: 'trello.com',
  asana: 'asana.com',
  monday: 'monday.com',
  github: 'github.com',
  gitlab: 'gitlab.com',
  bitbucket: 'bitbucket.org',
  stackoverflow: 'stackoverflow.com',
  aws: 'aws.amazon.com',
  azure: 'azure.microsoft.com',
  gcp: 'cloud.google.com',
  digitalocean: 'digitalocean.com',
  heroku: 'heroku.com',
  vercel: 'vercel.com',
  netlify: 'netlify.com',
  cloudflare: 'cloudflare.com',
  godaddy: 'godaddy.com',
  namecheap: 'namecheap.com',
  mailchimp: 'mailchimp.com',
  hubspot: 'hubspot.com',
  salesforce: 'salesforce.com',
  zendesk: 'zendesk.com',
  intercom: 'intercom.com',
  stripe: 'stripe.com',
  square: 'squareup.com',
  shopee: 'shopee.com',
  lazada: 'lazada.com',
  grab: 'grab.com',
  gojek: 'gojek.com',
  olx: 'olx.com',
  mercadolibre: 'mercadolibre.com',
  rappi: 'rappi.com',
  ifood: 'ifood.com.br',
  deliveroo: 'deliveroo.com',
  justeat: 'just-eat.com',
  foodpanda: 'foodpanda.com',
  swiggy: 'swiggy.com',
  zomato: 'zomato.com',
  ola: 'olacabs.com',
  didi: 'didiglobal.com',
  bolt: 'bolt.eu',
  blablacar: 'blablacar.com',
  '7-eleven': '7-eleven.com',
  'seven-eleven': '7-eleven.com',
  agoda: 'agoda.com',
  trivago: 'trivago.com',
  kayak: 'kayak.com',
  skyscanner: 'skyscanner.com',
  tripadvisor: 'tripadvisor.com',
  yelp: 'yelp.com',
  foursquare: 'foursquare.com',
  starbucks: 'starbucks.com',
  mcdonalds: 'mcdonalds.com',
  burgerking: 'bk.com',
  kfc: 'kfc.com',
  pizzahut: 'pizzahut.com',
  dominos: 'dominos.com',
  subway: 'subway.com',
  chipotle: 'chipotle.com',
  '888poker': '888poker.com',
  poker: 'pokerstars.com',
  betfair: 'betfair.com',
  draftkings: 'draftkings.com',
  fanduel: 'fanduel.com',
  bet365: 'bet365.com',
}

// Fallback emoji icons for when logo fetch fails
const FALLBACK_EMOJIS: Record<string, string> = {
  whatsapp: '💬',
  telegram: '✈️',
  google: '🔍',
  facebook: '👤',
  instagram: '📷',
  twitter: '🐦',
  tiktok: '🎵',
  discord: '🎮',
  snapchat: '👻',
  uber: '🚗',
  amazon: '📦',
  netflix: '🎬',
  spotify: '🎧',
  paypal: '💳',
  microsoft: '🪟',
  apple: '🍎',
  linkedin: '💼',
  yahoo: '📧',
  steam: '🎮',
  twitch: '📺',
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

  // Try partial match
  for (const [key, domain] of Object.entries(SERVICE_DOMAINS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return domain
    }
  }

  // Try to construct domain from name
  // E.g., "Booking.com" -> "booking.com"
  if (serviceName.toLowerCase().includes('.')) {
    return serviceName.toLowerCase().replace(/\s+/g, '')
  }

  // Try common patterns
  const cleanName = serviceName.toLowerCase().replace(/[^a-z0-9]/g, '')
  const possibleDomains = [
    `${cleanName}.com`,
    `${cleanName}.io`,
    `${cleanName}.app`,
    `${cleanName}.co`,
  ]

  return possibleDomains[0] // Default to .com
}

function getFallbackEmoji(serviceName: string): string {
  const normalized = serviceName.toLowerCase().replace(/[^a-z0-9]/g, '')

  for (const [key, emoji] of Object.entries(FALLBACK_EMOJIS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return emoji
    }
  }

  return '📱'
}

export default function ServiceLogo({ name, size = 32, className = '' }: ServiceLogoProps) {
  const [logoError, setLogoError] = useState(false)
  const [faviconError, setFaviconError] = useState(false)

  const domain = getServiceDomain(name)
  const fallbackEmoji = getFallbackEmoji(name)

  // Try Clearbit logo first (higher quality)
  const clearbitUrl = domain ? `https://logo.clearbit.com/${domain}` : null
  // Fallback to Google favicon
  const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null

  // If both failed, show emoji
  if (!domain || (logoError && faviconError)) {
    return (
      <span className={`text-2xl flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
        {fallbackEmoji}
      </span>
    )
  }

  // Try Clearbit logo first
  if (!logoError && clearbitUrl) {
    return (
      <div className={`relative bg-white rounded-lg overflow-hidden ${className}`} style={{ width: size, height: size }}>
        <Image
          src={clearbitUrl}
          alt={name}
          width={size}
          height={size}
          className="object-contain p-1"
          onError={() => setLogoError(true)}
          unoptimized
        />
      </div>
    )
  }

  // Fallback to Google favicon
  if (!faviconError && faviconUrl) {
    return (
      <div className={`relative bg-white rounded-lg overflow-hidden ${className}`} style={{ width: size, height: size }}>
        <Image
          src={faviconUrl}
          alt={name}
          width={size}
          height={size}
          className="object-contain p-1"
          onError={() => setFaviconError(true)}
          unoptimized
        />
      </div>
    )
  }

  // Final fallback to emoji
  return (
    <span className={`text-2xl flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {fallbackEmoji}
    </span>
  )
}
